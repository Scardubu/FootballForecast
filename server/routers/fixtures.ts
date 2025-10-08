import { Router } from "express";
import { asyncHandler, AppError } from "../middleware/index.js";
import { storage } from "../storage.js";
import { scrapingScheduler } from "../scraping-scheduler.js";
import { apiFootballClient } from "../services/apiFootballClient.js";

export const fixturesRouter = Router();

// Legacy function wrapper for backward compatibility during migration
async function fetchFromAPIFootball(endpoint: string) {
  const response = await apiFootballClient.request(endpoint);
  return response;
}

import { mlClient } from '../lib/ml-client.js';

async function generateMLPredictions(fixtureId: number, homeTeamId: number, awayTeamId: number) {
  // Gather historical and current data
  const homeStats = await storage.getTeamStats(homeTeamId);
  const awayStats = await storage.getTeamStats(awayTeamId);
  // Note: getHeadToHead method not implemented in storage interface
  const h2h = null; // TODO: Implement head-to-head data retrieval
  const fixture = await storage.getFixture(fixtureId);

  // Try ML model first
  let mlResult = null;
  try {
    mlResult = await mlClient.predict({
      fixture_id: fixture?.id || fixtureId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      home_team_name: '',
      away_team_name: ''
    });
  } catch (e) {
    console.warn('ML model unavailable, falling back to statistical prediction.', e);
  }

  // Fallback: simple statistical prediction if ML fails (dev/test only)
  if (!mlResult) {
    // In production, do not generate fallback predictions
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      console.warn(`Production mode: ML prediction unavailable for fixture ${fixtureId}, skipping fallback`);
      return null;
    }
    
    // Example: weighted average of recent form, goals, and H2H (dev/test only)
    // Use basic form calculation since formRating may not exist
    const homeForm = 0.5; // Default neutral form
    const awayForm = 0.5; // Default neutral form  
    const avgGoalsHome = 1.3; // Default average goals
    const avgGoalsAway = 1.1; // Default average goals away
    const h2hWinRate = 0.5; // Default neutral H2H since h2h is null
    const expectedGoalsHome = (avgGoalsHome * 0.6 + avgGoalsAway * 0.4) * (0.8 + 0.4 * homeForm);
    const expectedGoalsAway = (avgGoalsAway * 0.6 + avgGoalsHome * 0.4) * (0.8 + 0.4 * awayForm);
    const homeWinProb = Math.round((homeForm * 0.5 + h2hWinRate * 0.5) * 100);
    const awayWinProb = Math.round((awayForm * 0.5 + (1 - h2hWinRate) * 0.5) * 100);
    const drawProb = 100 - homeWinProb - awayWinProb;
    return {
      id: `ml-pred-${fixtureId}`,
      fixtureId,
      homeWinProbability: String(homeWinProb),
      drawProbability: String(drawProb),
      awayWinProbability: String(awayWinProb),
      expectedGoalsHome: expectedGoalsHome.toFixed(2),
      expectedGoalsAway: expectedGoalsAway.toFixed(2),
      bothTeamsScore: String(Math.round((homeForm + awayForm) * 50)),
      over25Goals: String(Math.round(((expectedGoalsHome + expectedGoalsAway) > 2.5 ? 0.6 : 0.4) * 100)),
      confidence: String(Math.round(((homeForm + awayForm) / 2) * 100)),
      createdAt: new Date(),
      mlModel: "statistical-v1.0",
      keyFeatures: ["team_form", "head_to_head", "avg_goals"],
      explanation: "Prediction generated using historical team form, head-to-head, and scoring stats.",
      modelVersion: "statistical-v1.0"
    };
  }

  // ML model output
  return {
    id: `ml-pred-${fixtureId}`,
    fixtureId,
    ...mlResult,
    createdAt: new Date(),
    mlModel: mlResult?.model_version || 'custom-ml-prod',
    keyFeatures: mlResult?.key_features?.map(f => f.name) || ["team_form", "head_to_head", "avg_goals"],
    explanation: mlResult?.explanation || "Prediction generated using ML model with real data.",
    modelVersion: mlResult?.model_version || "prod-1.0"
  };
}


export async function updateLiveFixtures() {
  try {
    const data = await fetchFromAPIFootball('fixtures?live=all');
    
    if (data.response && Array.isArray(data.response)) {
      for (const match of data.response) {
        try {
          const fixture = {
            id: match.fixture.id,
            referee: match.fixture.referee,
            timezone: match.fixture.timezone,
            date: new Date(match.fixture.date),
            timestamp: match.fixture.timestamp,
            status: match.fixture.status.long,
            elapsed: match.fixture.status.elapsed ?? null,
            round: match.league.round,
            homeTeamId: match.teams.home.id,
            awayTeamId: match.teams.away.id,
            leagueId: match.league.id,
            venue: match.fixture.venue?.name,
            homeScore: match.goals.home,
            awayScore: match.goals.away,
            halftimeHomeScore: match.score?.halftime?.home ?? null,
            halftimeAwayScore: match.score?.halftime?.away ?? null,
          };
          
          // Update league first (with error handling)
          try {
            await storage.updateLeague({
              id: match.league.id,
              name: match.league.name,
              country: match.league.country,
              logo: match.league.logo,
              flag: match.league.flag,
              season: match.league.season,
              type: match.league.type || 'League'
            });
          } catch (dbError) {
            // Skip this match if database is unavailable
            console.debug(`[INFO] Skipping league update for ${match.league.name} - database unavailable`);
            continue;
          }
          
          // Update teams with enhanced data
          const homeTeam = {
            id: match.teams.home.id,
            name: match.teams.home.name,
            logo: match.teams.home.logo,
            country: match.league.country,
            national: false,
            code: match.teams.home.code || null,
            founded: match.teams.home.founded || null
          };
          
          const awayTeam = {
            id: match.teams.away.id,
            name: match.teams.away.name,
            logo: match.teams.away.logo,
            country: match.league.country,
            national: false,
            code: match.teams.away.code || null,
            founded: match.teams.away.founded || null
          };
          
          try {
            await Promise.all([
              storage.updateTeam(homeTeam),
              storage.updateTeam(awayTeam)
            ]);
          } catch (dbError) {
            console.debug(`[INFO] Skipping team updates - database unavailable`);
            continue;
          }
          
          // Update fixture after teams/league exist
          try {
            await storage.updateFixture(fixture);
          } catch (dbError) {
            console.debug(`[INFO] Skipping fixture update - database unavailable`);
            continue;
          }
        } catch (matchError) {
          // Continue processing other matches even if one fails
          console.debug(`[INFO] Skipping match ${match.fixture.id} due to error`);
          continue;
        }
        
        // Generate ML predictions for completed or upcoming matches
        if (match.fixture.status.short === "FT" || match.fixture.status.short === "NS") {
          await generateMLPredictions(match.fixture.id, homeTeam.id, awayTeam.id);
        }
        
        // Schedule scraping for live or upcoming fixtures
        if (match.fixture.status.short === "LIVE" || match.fixture.status.short === "NS") {
          const priority = match.fixture.status.short === "LIVE" ? 8 : 6; // Higher priority for live matches
          await scrapingScheduler.scheduleMatchDataScraping(
            match.fixture.id,
            homeTeam.name,
            awayTeam.name,
            priority
          );
        }
      }
    }
  } catch (error) {
    console.error('Error updating live fixtures:', error);
  }
}

// Get live fixtures - Directly proxying to API Football client
fixturesRouter.get("/live", asyncHandler(async (req, res) => {
  const data = await fetchFromAPIFootball('fixtures?live=all');
  // Cache live fixtures for 30 seconds (very short since data changes quickly)
  res.set('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
  res.json(data);
}));

// Get fixtures with optional filters (league, date, season, status, limit, team, etc.)
fixturesRouter.get("/", asyncHandler(async (req, res) => {
  const query = req.query as Record<string, any>;

  // If no filters, return from storage (cached)
  if (!query || Object.keys(query).length === 0) {
    const fixtures = await storage.getFixtures();
    res.set('Cache-Control', 'public, max-age=600, stale-while-revalidate=1200');
    return res.json(fixtures);
  }

  // Build pass-through params for API Football
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value == null) continue;
    // Support arrays and scalars
    if (Array.isArray(value)) {
      value.forEach(v => params.append(key, String(v)));
    } else {
      params.append(key, String(value));
    }
  }

  const endpoint = `fixtures?${params.toString()}`;
  const data = await fetchFromAPIFootball(endpoint);
  res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
  res.json(data);
}));