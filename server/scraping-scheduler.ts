/**
 * Scraping Scheduler - Orchestrates automated data collection from external sources
 */
import * as cron from 'node-cron';
import { spawn } from 'child_process';
import { storage } from './storage.js';

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
  
  constructor() {
    this.startNightlyTeamRatingsJob();
    this.startQueueProcessor();
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
        
        console.log('✅ Nightly team ratings refresh scheduled');
      } catch (error) {
        console.error('❌ Error scheduling nightly team ratings refresh:', error);
      }
    }, {
      timezone: "UTC"
    });
    
    console.log('🕐 Nightly team ratings job scheduled for 2:00 AM UTC');
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
      console.log(`✅ Scrape job completed: ${job.id}`);
      
    } catch (error) {
      job.status = 'failed';
      console.error(`❌ Scrape job failed: ${job.id}`, error);
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
console.log('🕐 Scraping scheduler initialized successfully');

export const scrapingScheduler = scheduler;