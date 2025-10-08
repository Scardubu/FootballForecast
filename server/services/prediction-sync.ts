import { differenceInMinutes, parseISO } from 'date-fns';
import { logger } from '../middleware/logger.js';
import type { Prediction, Fixture, Team } from "../../shared/schema.js";
import { TOP_LEAGUES } from "../lib/data-seeder.js";
import {
  beginIngestionEvent,
  completeIngestionEvent,
  failIngestionEvent
} from "../lib/ingestion-tracker.js";

// Import storage
import { storage } from "../storage.js";
import { apiFootballClient } from "./apiFootballClient.js";

const UPCOMING_FIXTURE_LOOKAHEAD = parseInt(process.env.PREDICTION_FIXTURE_LOOKAHEAD || "5", 10);
const PREDICTION_REFRESH_MINUTES = parseInt(process.env.PREDICTION_REFRESH_MINUTES || "90", 10);
const RECENT_MATCH_SAMPLE = parseInt(process.env.PREDICTION_RECENT_MATCH_SAMPLE || "8", 10);
const SYNC_INTERVAL_MINUTES = parseInt(process.env.PREDICTION_SYNC_INTERVAL_MINUTES || "15", 10);
const updatedTeamsThisRun = new Set<number>();

export async function syncUpcomingPredictions(): Promise<void> {
  const start = Date.now();
  const season = determineSeason();
  let predictionsUpdated = 0;
  let teamsIngested = 0;
  let fixturesProcessed = 0;

  const fixturesNeedingPrediction = new Set<number>();

  const ingestionCtx = await beginIngestionEvent({
    source: "prediction-sync",
    scope: "upcoming-fixtures",
    metadata: {
      season,
      lookahead: UPCOMING_FIXTURE_LOOKAHEAD,
    },
  });

  try {
    for (const league of TOP_LEAGUES) {
      let matches = [];
      try {
        matches = await fetchUpcomingFixtures(league.id, season);
        
        // If no matches returned, skip this league (expected for free API plans)
        if (!matches || matches.length === 0) {
          logger.info({ leagueId: league.id }, "No upcoming fixtures available for league (expected with free API plans)");
          continue;
        }
      } catch (error: any) {
        // Skip league if API limit reached or other errors
        if (error?.message?.includes('API_LIMIT_REACHED') || error?.message?.includes('API_PLAN_LIMIT')) {
          logger.warn({ leagueId: league.id, error: error.message }, "Skipping league due to API limitation");
          continue;
        }
        // Don't throw - just log and continue with next league
        logger.info({ leagueId: league.id, error: error.message }, "Skipping league due to API error");
        continue;
      }
      
      for (const match of matches) {
        fixturesProcessed += 1;

        const { fixture, homeTeam, awayTeam } = mapApiFixture(match, league);

        await Promise.all([
          storage.updateLeague({
            id: league.id,
            name: league.name,
            country: league.country,
            logo: match.league.logo ?? null,
            flag: match.league.flag ?? null,
            season: season || 2023, // Ensure season is never null
            type: match.league.type ?? "League",
          }),
          ingestTeam(homeTeam).then((changed) => {
            if (changed) teamsIngested += 1;
          }),
          ingestTeam(awayTeam).then((changed) => {
            if (changed) teamsIngested += 1;
          }),
        ]);

        await storage.updateFixture(fixture);

        // Skip recent matches fetch to avoid API rate limits during sync
        // Recent matches will be fetched on-demand when predictions are requested
        // await Promise.all([
        //   ensureRecentMatches(homeTeam.id, season),
        //   ensureRecentMatches(awayTeam.id, season),
        // ]);

        if (await needsPredictionRefresh(fixture.id)) {
          fixturesNeedingPrediction.add(fixture.id);
        }
      }
    }

    // For free plan/dev mode: skip ML/batch prediction generation.
    // Predictions will be created on-demand via API when requested.

    const duration = Date.now() - start;

    await completeIngestionEvent(ingestionCtx, {
      recordsWritten: predictionsUpdated,
      metadata: {
        season,
        fixturesProcessed,
        predictionsUpdated,
        teamsIngested,
        duration,
        lookahead: UPCOMING_FIXTURE_LOOKAHEAD,
        refreshWindowMinutes: PREDICTION_REFRESH_MINUTES,
      },
    });

    logger.info({
      fixturesProcessed,
      predictionsUpdated,
      teamsIngested,
      duration,
    }, "Prediction sync completed");
  } catch (error) {
    await failIngestionEvent(ingestionCtx, error, {
      recordsWritten: predictionsUpdated,
      metadata: {
        season,
        fixturesProcessed,
        predictionsUpdated,
        teamsIngested,
      },
    });
    logger.error({ error }, "Prediction sync failed");
    throw error;
  } finally {
    updatedTeamsThisRun.clear();
  }
}

// buildPredictionRecord removed (batch prediction writing disabled in free-plan/dev mode)

// buildInsightSummary removed along with batch prediction writer utilities

function determineSeason(): number {
  // Determine current season based on date
  // Football seasons typically run from August to May
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed
  
  // If we're in January-July, we're still in the previous year's season
  // If we're in August-December, we're in the current year's season
  const season = currentMonth >= 8 ? currentYear : currentYear - 1;
  
  // For free API plans that only support historical data (2021-2023),
  // cap the season to 2023 and use date-based queries without season parameter
  const maxSupportedSeason = 2023;
  
  // Return current season for metadata, but API queries will use date-based approach
  return Math.min(season, maxSupportedSeason);
}

export function startPredictionSyncScheduler(): void {
  // Allow disabling prediction sync via environment variable
  // Useful for free API plans to conserve quota
  const disableSync = (process.env.DISABLE_PREDICTION_SYNC || '').toLowerCase() === 'true';
  
  if (disableSync) {
    logger.info('Prediction sync disabled via DISABLE_PREDICTION_SYNC environment variable');
    logger.info('Application will use on-demand fallback predictions only');
    logger.info('To enable prediction sync, set DISABLE_PREDICTION_SYNC=false in .env');
    return;
  }
  
  const intervalMs = SYNC_INTERVAL_MINUTES * 60 * 1000;
  setInterval(() => {
    syncUpcomingPredictions().catch((error) => {
      logger.warn({ error: error.message }, "Scheduled prediction sync failed (expected with free API plans)");
    });
  }, intervalMs);

  // Trigger an initial sync with delay to avoid startup congestion
  setTimeout(() => {
    syncUpcomingPredictions().catch((error) => {
      logger.warn({ error: error.message }, "Initial prediction sync failed (expected with free API plans)");
    });
  }, 30000); // Wait 30 seconds after startup

  logger.info({ intervalMs: SYNC_INTERVAL_MINUTES }, "Prediction sync scheduler started");
  logger.info('Note: Free API plans may not have current fixture data. Application will use fallback predictions.');
}

async function fetchUpcomingFixtures(leagueId: number, season: number) {
  // Free API plan limitations:
  // - Doesn't support 'next' parameter  
  // - Only supports historical seasons 2021-2023
  // - For current/future fixtures, use date query without season parameter
  // - Empty responses are expected for future dates with free plans
  
  const today = new Date();
  const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const fromDate = today.toISOString().split('T')[0];
  const toDate = nextWeek.toISOString().split('T')[0];
  
  // Query current fixtures by date range (no season parameter for current data)
  // Free plans may not have data for current/future dates
  const endpoint = `fixtures?league=${leagueId}&from=${fromDate}&to=${toDate}`;
  
  try {
    const response = await apiFootballClient.request<any>(endpoint);
    
    // Handle empty response gracefully - this is expected for free plans
    if (!response?.response || !Array.isArray(response.response) || response.response.length === 0) {
      logger.info({ leagueId, fromDate, toDate }, "No upcoming fixtures available (expected for free API plans)");
      return [];
    }
    
    // Filter for upcoming fixtures only (not finished)
    const upcomingFixtures = response.response
      .filter((match: any) => {
        const status = match.fixture?.status?.short;
        return status === 'NS' || status === 'TBD' || status === 'PST';
      })
      .slice(0, UPCOMING_FIXTURE_LOOKAHEAD);
    
    logger.info({ leagueId, count: upcomingFixtures.length }, "Fetched upcoming fixtures");
    return upcomingFixtures;
  } catch (error: any) {
    // If API call fails, return empty array (application will use fallback data)
    logger.info({ leagueId, error: error.message }, "API request failed, using fallback data");
    return [];
  }
}

function mapApiFixture(match: any, league: { id: number; name: string; country: string }): {
  fixture: Fixture;
  homeTeam: Team;
  awayTeam: Team;
} {
  const fixture: Fixture = {
    id: match.fixture.id,
    referee: match.fixture.referee || null,
    timezone: match.fixture.timezone || "UTC",
    date: new Date(match.fixture.date),
    timestamp: match.fixture.timestamp ?? null,
    status: match.fixture.status?.short || "NS",
    elapsed: match.fixture.status?.elapsed ?? null,
    round: match.league?.round ?? null,
    homeTeamId: match.teams.home.id,
    awayTeamId: match.teams.away.id,
    leagueId: league.id,
    venue: match.fixture.venue?.name ?? null,
    homeScore: match.goals?.home ?? null,
    awayScore: match.goals?.away ?? null,
    halftimeHomeScore: match.score?.halftime?.home ?? null,
    halftimeAwayScore: match.score?.halftime?.away ?? null,
  };

  const homeTeam: Team = {
    id: match.teams.home.id,
    name: match.teams.home.name,
    code: match.teams.home.code ?? null,
    country: league.country,
    founded: match.teams.home.founded ?? null,
    national: match.teams.home.national ?? false,
    logo: match.teams.home.logo ?? null,
  };

  const awayTeam: Team = {
    id: match.teams.away.id,
    name: match.teams.away.name,
    code: match.teams.away.code ?? null,
    country: league.country,
    founded: match.teams.away.founded ?? null,
    national: match.teams.away.national ?? false,
    logo: match.teams.away.logo ?? null,
  };

  return { fixture, homeTeam, awayTeam };
}

async function ingestTeam(team: Team): Promise<boolean> {
  if (updatedTeamsThisRun.has(team.id)) {
    return false;
  }

  const existing = await storage.getTeam(team.id);
  if (existing) {
    const needsUpdate = !existing.logo && !!team.logo;
    if (needsUpdate) {
      await storage.updateTeam({ ...existing, logo: team.logo });
      updatedTeamsThisRun.add(team.id);
      return true;
    }
    return false;
  }

  await storage.updateTeam(team);
  updatedTeamsThisRun.add(team.id);
  return true;
}

async function ensureRecentMatches(teamId: number, season: number): Promise<void> {
  const recent = await storage.getFixtures();
  const hasRecentHistory = recent.some((fixture) => {
    if (fixture.status !== "FT") return false;
    if (fixture.homeTeamId !== teamId && fixture.awayTeamId !== teamId) return false;
    if (!fixture.date) return false;
    return differenceInMinutes(new Date(), fixture.date) <= 60 * 24 * 60; // within 60 days
  });

  if (hasRecentHistory) {
    return;
  }

  try {
    // Use date-based query with supported season (2023 for free plan)
    // Free API plan only supports seasons 2021-2023
    const supportedSeason = 2023;
    const fromDate = new Date('2023-08-01'); // Start of 2023-24 season
    const toDate = new Date('2024-05-31');   // End of 2023-24 season
    
    const endpoint = `fixtures?team=${teamId}&season=${supportedSeason}&from=${fromDate.toISOString().split('T')[0]}&to=${toDate.toISOString().split('T')[0]}`;
    const response = await apiFootballClient.request<any>(endpoint);
    if (!response?.response || !Array.isArray(response.response)) {
      return;
    }
    
    // Limit to most recent matches
    const recentMatches = response.response
      .filter((m: any) => m.fixture?.status?.short === 'FT')
      .sort((a: any, b: any) => new Date(b.fixture.date).getTime() - new Date(a.fixture.date).getTime())
      .slice(0, RECENT_MATCH_SAMPLE);

    for (const match of recentMatches) {
      const league = {
        id: match.league.id,
        name: match.league.name,
        country: match.league.country,
      };

      const { fixture, homeTeam, awayTeam } = mapApiFixture(match, league);
      await Promise.all([
        // League data - ensure season is provided
        await storage.updateLeague({
          id: league.id,
          name: league.name,
          country: league.country,
          logo: match.league.logo ?? null,
          flag: match.league.flag ?? null,
          season: supportedSeason, // Ensure season is never null in this scope
          type: match.league.type ?? "League",
        }),
        ingestTeam(homeTeam),
        ingestTeam(awayTeam),
      ]);

      await storage.updateFixture(fixture);
    }
  } catch (error) {
    logger.warn({ teamId, error }, "Failed to fetch recent matches for team");
  }
}

async function needsPredictionRefresh(fixtureId: number): Promise<boolean> {
  const existingPredictions = await storage.getPredictions(fixtureId);
  const latest = existingPredictions[0];

  if (!latest || !latest.createdAt) {
    return true;
  }

  const createdAtDate = latest.createdAt instanceof Date ? latest.createdAt : parseISO(String(latest.createdAt));
  const minutesSinceCreation = differenceInMinutes(new Date(), createdAtDate);
  return minutesSinceCreation >= PREDICTION_REFRESH_MINUTES;
}

// Prediction record utilities removed for free-plan/dev mode. Predictions are
// generated on-demand via API; batch writing is disabled to conserve quota.
