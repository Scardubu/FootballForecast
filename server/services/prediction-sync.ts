import { differenceInMinutes, parseISO } from "date-fns";
import { logger } from "../middleware/logger.js";
import { apiFootballClient } from "./apiFootballClient.js";
import { storage } from "../storage.js";
import { PredictionEngine, type EnhancedPrediction } from "./predictionEngine.js";
import type { Prediction, Fixture, Team } from "../../shared/schema.js";
import { TOP_LEAGUES } from "../lib/data-seeder.js";
import {
  beginIngestionEvent,
  completeIngestionEvent,
  failIngestionEvent
} from "../lib/ingestion-tracker.js";

const predictionEngine = new PredictionEngine();

const UPCOMING_FIXTURE_LOOKAHEAD = parseInt(process.env.PREDICTION_FIXTURE_LOOKAHEAD || "5", 10);
const PREDICTION_REFRESH_MINUTES = parseInt(process.env.PREDICTION_REFRESH_MINUTES || "90", 10);
const RECENT_MATCH_SAMPLE = parseInt(process.env.PREDICTION_RECENT_MATCH_SAMPLE || "8", 10);
const SYNC_INTERVAL_MINUTES = parseInt(process.env.PREDICTION_SYNC_INTERVAL_MINUTES || "15", 10);

const updatedTeamsThisRun = new Set<number>();

export async function syncUpcomingPredictions(): Promise<void> {
  const start = Date.now();
  const season = determineSeason();

  let fixturesProcessed = 0;
  let predictionsUpdated = 0;
  let teamsIngested = 0;

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
      const matches = await fetchUpcomingFixtures(league.id, season);
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
            season,
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

        await Promise.all([
          ensureRecentMatches(homeTeam.id, season),
          ensureRecentMatches(awayTeam.id, season),
        ]);

        if (await needsPredictionRefresh(fixture.id)) {
          fixturesNeedingPrediction.add(fixture.id);
        }
      }
    }

    const fixtureIds = Array.from(fixturesNeedingPrediction);
    const existingPredictionMap = await loadExistingPredictions(fixtureIds);

    const batchResults = await predictionEngine.generateBatchPredictions(fixtureIds);

    for (const fixtureId of fixtureIds) {
      const enhancedResult = batchResults.get(fixtureId) ?? (await fallbackGeneratePrediction(fixtureId));
      if (!enhancedResult) {
        continue;
      }

      const existing = existingPredictionMap.get(fixtureId);
      await writePredictionRecord(enhancedResult, existing?.id);
      predictionsUpdated += 1;
    }

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

function buildPredictionRecord(enhanced: EnhancedPrediction, existingId?: string): Prediction {
  const outcomeScores = {
    home: enhanced.predictions.homeWin,
    draw: enhanced.predictions.draw,
    away: enhanced.predictions.awayWin,
  };

  const predictedOutcome = Object.entries(outcomeScores).sort((a, b) => b[1] - a[1])[0][0];

  const confidenceMap: Record<string, number> = {
    high: 90,
    medium: 70,
    low: 50,
  };

  const confidenceValue = confidenceMap[enhanced.predictions.confidence] ?? 60;

  const record: Prediction = {
    id: existingId ?? `pred-${enhanced.fixtureId}`,
    fixtureId: enhanced.fixtureId,
    homeWinProbability: String(Math.round(enhanced.predictions.homeWin)),
    drawProbability: String(Math.round(enhanced.predictions.draw)),
    awayWinProbability: String(Math.round(enhanced.predictions.awayWin)),
    expectedGoalsHome: Number(enhanced.insights.expectedGoals.home).toFixed(2),
    expectedGoalsAway: Number(enhanced.insights.expectedGoals.away).toFixed(2),
    bothTeamsScore: String(Math.round(enhanced.additionalMarkets.btts ?? enhanced.additionalMarkets.bothTeamsToScore ?? 50)),
    over25Goals: String(Math.round(enhanced.additionalMarkets.over25Goals ?? 50)),
    confidence: String(confidenceValue),
    mlModel: "hybrid-ml-v2",
    predictedOutcome,
    latencyMs: null,
    serviceLatencyMs: null,
    modelCalibrated: true,
    modelTrained: true,
    calibrationMetadata: {
      dataQuality: enhanced.reasoning?.dataQuality ?? null,
      generatedAt: new Date().toISOString(),
      sources: enhanced.reasoning?.dataQuality?.sources ?? [],
    },
    createdAt: new Date(),
    aiInsight: buildInsightSummary(enhanced),
  };

  return record;
}

function buildInsightSummary(enhanced: any): string {
  const factors = enhanced.reasoning?.topFactors?.slice(0, 3) ?? [];
  if (factors.length === 0) {
    return `Model favors ${enhanced.predictions.homeWin > enhanced.predictions.awayWin ? enhanced.homeTeam : enhanced.awayTeam}`;
  }

  const factorSummary = factors
    .map((factor: any) => `${factor.factor}: ${factor.description ?? "key influence"}`)
    .join(" | ");

  return `${enhanced.homeTeam} vs ${enhanced.awayTeam} – ${factorSummary}`;
}

function determineSeason(): number {
  // Free API plan only supports seasons 2021-2023
  // Use 2023 as the latest supported season for historical data
  return 2023;
}

export function startPredictionSyncScheduler(): void {
  const intervalMs = SYNC_INTERVAL_MINUTES * 60 * 1000;
  setInterval(() => {
    syncUpcomingPredictions().catch((error) => {
      logger.error({ error }, "Scheduled prediction sync failed");
    });
  }, intervalMs);

  // Trigger an initial sync without awaiting (fire and forget)
  syncUpcomingPredictions().catch((error) => {
    logger.error({ error }, "Initial prediction sync failed");
  });

  logger.info({ intervalMs: SYNC_INTERVAL_MINUTES }, "Prediction sync scheduler started");
}

async function fetchUpcomingFixtures(leagueId: number, season: number) {
  const nextParam = Math.max(1, Math.min(UPCOMING_FIXTURE_LOOKAHEAD, 20));
  const endpoint = `fixtures?league=${leagueId}&season=${season}&next=${nextParam}`;
  const response = await apiFootballClient.request<any>(endpoint);
  if (!response?.response || !Array.isArray(response.response)) {
    logger.warn({ leagueId, season }, "No upcoming fixtures returned from API-Football");
    return [];
  }
  return response.response;
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
        storage.updateLeague({
          id: league.id,
          name: league.name,
          country: league.country,
          logo: match.league.logo ?? null,
          flag: match.league.flag ?? null,
          season,
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

async function loadExistingPredictions(fixtureIds: number[]): Promise<Map<number, Prediction>> {
  const map = new Map<number, Prediction>();
  for (const fixtureId of fixtureIds) {
    const predictions = await storage.getPredictions(fixtureId);
    if (predictions.length > 0) {
      map.set(fixtureId, predictions[0]);
    }
  }
  return map;
}

async function fallbackGeneratePrediction(fixtureId: number): Promise<EnhancedPrediction | null> {
  try {
    return await predictionEngine.generatePrediction(fixtureId);
  } catch (error) {
    logger.warn({ fixtureId, error }, "Fallback single prediction generation failed");
    return null;
  }
}

async function writePredictionRecord(enhanced: EnhancedPrediction, existingId?: string): Promise<void> {
  const record = buildPredictionRecord(enhanced, existingId);
  await storage.updatePrediction(record);
}
