/**
 * Scraping Scheduler - Orchestrates automated data collection from external sources
 */
import * as cron from 'node-cron';
import { spawn } from 'child_process';
import { storage } from './storage.js';
import type { Fixture } from '../shared/schema.js';

interface ScrapeJob {
  id: string;
  type: 'match_data' | 'team_ratings';
  fixtureId?: number;
  teamId?: number;
  homeTeam?: string;
  awayTeam?: string;
  teamName?: string;
  priority: number; // 1-10, higher = more urgent
  scheduledAt: Date;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

class ScrapingScheduler {
  private scrapeQueue: ScrapeJob[] = [];
  private activeScrapes = new Set<string>();
  private maxConcurrentScrapes = 2; // Limit concurrent operations
  private isProcessingQueue = false;
  private oddsRefreshTimer: NodeJS.Timeout | null = null;
  private injuryRefreshTimer: NodeJS.Timeout | null = null;
  private readonly oddsRefreshIntervalMs = parseInt(process.env.SCRAPE_ODDS_INTERVAL_MS || `${10 * 60 * 1000}`, 10); // default 10 minutes
  private readonly injuryRefreshIntervalMs = parseInt(process.env.SCRAPE_INJURY_INTERVAL_MS || `${60 * 60 * 1000}`, 10); // default 1 hour
  private readonly oddsWindowMs = parseInt(process.env.SCRAPE_ODDS_WINDOW_MS || `${12 * 60 * 60 * 1000}`, 10); // default 12 hours lookahead
  private readonly injuryWindowMs = parseInt(process.env.SCRAPE_INJURY_WINDOW_MS || `${48 * 60 * 60 * 1000}`, 10); // default 48 hours lookahead
  private readonly lastOddsRefreshByFixture = new Map<number, number>();
  private readonly lastInjuryRefreshByFixture = new Map<number, number>();
  
  constructor() {
    this.startNightlyTeamRatingsJob();
    this.startQueueProcessor();
    this.startRecurringRefreshJobs();
  }

  /**
   * Schedule match data scraping for upcoming or live fixtures
   */
  async scheduleMatchDataScraping(fixtureId: number, homeTeam: string, awayTeam: string, priority: number = 5) {
    const job: ScrapeJob = {
      id: `match_${fixtureId}_${Date.now()}`,
      type: 'match_data',
      fixtureId,
      homeTeam,
      awayTeam,
      priority,
      scheduledAt: new Date(),
      status: 'pending'
    };

    this.scrapeQueue.push(job);
    this.sortQueueByPriority();
    
    console.log(`📅 Scheduled match scraping: ${homeTeam} vs ${awayTeam} (fixture ${fixtureId}) - Priority ${priority}`);
    
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  /**
   * Schedule team ratings scraping
   */
  async scheduleTeamRatingsScraping(teamId: number, teamName: string, priority: number = 3) {
    const job: ScrapeJob = {
      id: `team_${teamId}_${Date.now()}`,
      type: 'team_ratings',
      teamId,
      teamName,
      priority,
      scheduledAt: new Date(),
      status: 'pending'
    };

    this.scrapeQueue.push(job);
    this.sortQueueByPriority();
    
    console.log(`📅 Scheduled team ratings scraping: ${teamName} (ID ${teamId}) - Priority ${priority}`);
    
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  /**
   * Set up nightly job for team ratings refresh
   */
  private startNightlyTeamRatingsJob() {
    // Run at 2:00 AM daily
    cron.schedule('0 2 * * *', async () => {
      console.log('🌙 Starting nightly team ratings refresh...');
      
      try {
        // Get all teams from database
        const teams = await storage.getTeams();
        console.log(`Found ${teams.length} teams for nightly ratings update`);
        
        // Schedule team ratings scraping for all teams (lower priority)
        for (const team of teams) {
          await this.scheduleTeamRatingsScraping(team.id, team.name, 2);
        }
        
        console.log('[OK] Nightly team ratings refresh scheduled');
      } catch (error) {
        console.error('[ERROR] Error scheduling nightly team ratings refresh:', error);
      }
    }, {
      timezone: "UTC"
    });
    
    console.log('[SCHEDULE] Nightly team ratings job scheduled for 2:00 AM UTC');
  }

  /**
   * Process the scraping queue with concurrency limits
   */
  private async processQueue() {
    if (this.isProcessingQueue) return;
    
    this.isProcessingQueue = true;
    
    while (this.scrapeQueue.length > 0 && this.activeScrapes.size < this.maxConcurrentScrapes) {
      const job = this.scrapeQueue.shift();
      if (!job) break;
      
      this.activeScrapes.add(job.id);
      job.status = 'running';
      
      // Process job asynchronously
      this.executeJob(job).finally(() => {
        this.activeScrapes.delete(job.id);
        // Continue processing queue
        if (this.scrapeQueue.length > 0 && this.activeScrapes.size < this.maxConcurrentScrapes) {
          setImmediate(() => this.processQueue());
        }
      });
    }
    
    this.isProcessingQueue = false;
  }

  /**
   * Execute a scraping job
   */
  private async executeJob(job: ScrapeJob): Promise<void> {
    console.log(`🚀 Executing scrape job: ${job.id} (${job.type})`);
    
    try {
      if (job.type === 'match_data' && job.fixtureId && job.homeTeam && job.awayTeam) {
        await this.runPythonScraper('match_data', {
          fixture_id: job.fixtureId,
          home_team: job.homeTeam,
          away_team: job.awayTeam
        });
      } else if (job.type === 'team_ratings' && job.teamId && job.teamName) {
        await this.runPythonScraper('team_data', {
          team_id: job.teamId,
          team_name: job.teamName
        });
      }
      
      job.status = 'completed';
      console.log(`[OK] Scrape job completed: ${job.id}`);
      
    } catch (error) {
      job.status = 'failed';
      console.error(`❌ Scrape job failed: ${job.id}`, error);
    }
  }

  /**
   * Start recurring jobs for odds / injury refresh based on TTLs
   */
  private startRecurringRefreshJobs() {
    const enableScraping = (process.env.ENABLE_SCRAPING || 'true').toLowerCase() !== 'false';
    if (!enableScraping) {
      console.log('⚠️ ENABLE_SCRAPING=false - skipping scheduled refresh jobs');
      return;
    }

    const runOddsRefresh = () => {
      this.refreshUpcomingFixtures('odds').catch(err => {
        console.error('❌ Scheduled odds refresh failed:', err);
      });
    };

    runOddsRefresh();
    this.oddsRefreshTimer = setInterval(runOddsRefresh, this.oddsRefreshIntervalMs);
    console.log(`[SCHEDULE] Odds refresh scheduled every ${Math.round(this.oddsRefreshIntervalMs / 60000)} minutes`);

    const runInjuryRefresh = () => {
      this.refreshUpcomingFixtures('injuries').catch(err => {
        console.error('❌ Scheduled injury refresh failed:', err);
      });
    };

    runInjuryRefresh();
    this.injuryRefreshTimer = setInterval(runInjuryRefresh, this.injuryRefreshIntervalMs);
    console.log(`[SCHEDULE] Injury refresh scheduled every ${Math.round(this.injuryRefreshIntervalMs / 60000)} minutes`);
  }

  /**
   * Refresh upcoming fixtures for odds or injuries when TTL expired
   */
  private async refreshUpcomingFixtures(target: 'odds' | 'injuries'): Promise<void> {
    const now = Date.now();
    const windowMs = target === 'odds' ? this.oddsWindowMs : this.injuryWindowMs;
    const fixtures = await storage.getFixtures();
    const upcoming = fixtures.filter(fixture => this.isFixtureWithinWindow(fixture, now, windowMs));

    if (upcoming.length === 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[INFO] No fixtures within ${Math.round(windowMs / 3600000)}h window for ${target} refresh`);
      }
      return;
    }

    const lastRefreshMap = target === 'odds' ? this.lastOddsRefreshByFixture : this.lastInjuryRefreshByFixture;
    const intervalMs = target === 'odds' ? this.oddsRefreshIntervalMs : this.injuryRefreshIntervalMs;

    for (const fixture of upcoming) {
      const lastRefresh = lastRefreshMap.get(fixture.id) ?? 0;
      if (now - lastRefresh < intervalMs) {
        continue;
      }

      const teams = await this.getFixtureTeams(fixture);
      if (!teams) {
        continue;
      }

      try {
        await this.triggerMlScrape(teams.teamIds, teams.teamNames, [fixture.id]);
        lastRefreshMap.set(fixture.id, now);
        if (process.env.NODE_ENV === 'development') {
          console.log(`[OK] Triggered ${target} refresh for fixture ${fixture.id}`);
        }
      } catch (error) {
        console.error(`[ERROR] Failed to trigger ${target} refresh for fixture ${fixture.id}:`, error);
      }
    }
  }

  private isFixtureWithinWindow(fixture: Fixture, now: number, windowMs: number): boolean {
    const timestampMs = fixture.timestamp
      ? fixture.timestamp * 1000
      : (fixture.date ? new Date(fixture.date).getTime() : NaN);
    if (!Number.isFinite(timestampMs)) {
      return false;
    }
    return timestampMs >= now && timestampMs <= now + windowMs;
  }

  private async getFixtureTeams(fixture: Fixture): Promise<{ teamIds: number[]; teamNames: string[] } | null> {
    if (!fixture.homeTeamId || !fixture.awayTeamId) {
      return null;
    }

    const [homeTeam, awayTeam] = await Promise.all([
      storage.getTeam(fixture.homeTeamId),
      storage.getTeam(fixture.awayTeamId)
    ]);

    if (!homeTeam || !awayTeam) {
      return null;
    }

    return {
      teamIds: [homeTeam.id, awayTeam.id],
      teamNames: [homeTeam.name, awayTeam.name]
    };
  }

  private async triggerMlScrape(teamIds: number[], teamNames: string[], fixtureIds: number[]): Promise<void> {
    const baseUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    const timeoutMs = parseInt(process.env.ML_SERVICE_TIMEOUT || '30000', 10);
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        body: JSON.stringify({
          team_ids: teamIds,
          team_names: teamNames,
          fixture_ids: fixtureIds
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`ML scrape trigger failed (${response.status}): ${errorText}`);
      }
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  /**
   * Run Python scraper with specified parameters
   */
  private async runPythonScraper(scrapeType: string, params: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const pythonArgs = [
        'src/scrapers/scraper_manager.py',
        '--type', scrapeType,
        '--params', JSON.stringify(params)
      ];
      
      const pythonProcess = spawn('python3', pythonArgs, {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`Python scraper output:`, stdout.slice(0, 200) + '...');
          resolve();
        } else {
          console.error(`Python scraper error (code ${code}):`, stderr);
          reject(new Error(`Python scraper failed with code ${code}`));
        }
      });
      
      // Set timeout for scraping operations (10 minutes)
      setTimeout(() => {
        pythonProcess.kill('SIGTERM');
        reject(new Error('Python scraper timeout'));
      }, 10 * 60 * 1000);
    });
  }

  /**
   * Sort queue by priority (higher priority first)
   */
  private sortQueueByPriority() {
    this.scrapeQueue.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Start the queue processor (runs every 30 seconds)
   */
  private startQueueProcessor() {
    setInterval(() => {
      if (!this.isProcessingQueue && this.scrapeQueue.length > 0) {
        this.processQueue();
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get scheduler status for monitoring
   */
  getStatus() {
    return {
      queueLength: this.scrapeQueue.length,
      activeScrapes: this.activeScrapes.size,
      maxConcurrentScrapes: this.maxConcurrentScrapes,
      isProcessing: this.isProcessingQueue,
      oddsRefreshIntervalMs: this.oddsRefreshIntervalMs,
      injuryRefreshIntervalMs: this.injuryRefreshIntervalMs,
      oddsWindowMs: this.oddsWindowMs,
      injuryWindowMs: this.injuryWindowMs,
      lastOddsRefreshByFixture: Array.from(this.lastOddsRefreshByFixture.entries()),
      lastInjuryRefreshByFixture: Array.from(this.lastInjuryRefreshByFixture.entries()),
      queuedJobs: this.scrapeQueue.map(job => ({
        id: job.id,
        type: job.type,
        priority: job.priority,
        status: job.status,
        scheduledAt: job.scheduledAt
      }))
    };
  }
}

// Create and export singleton instance
const scheduler = new ScrapingScheduler();
console.log('[OK] Scraping scheduler initialized successfully');

export const scrapingScheduler = scheduler;