import { Router } from "express";
import { asyncHandler, AppError } from "../middleware";
import { storage } from "../storage";
import { scrapingScheduler } from "../scraping-scheduler";
import { apiFootballClient } from "../services/apiFootballClient";

export const fixturesRouter = Router();

// Legacy function wrapper for backward compatibility during migration
async function fetchFromAPIFootball(endpoint: string) {
  const response = await apiFootballClient.request(endpoint);
  return response;
}

import { mlClient } from '../lib/ml-client';

async function generateMLPredictions(fixtureId: number, homeTeamId: number, awayTeamId: number) {
  // Gather historical and current data
  const homeStats = await storage.getTeamStats(homeTeamId);
  const awayStats = await storage.getTeamStats(awayTeamId);
  const h2h = await storage.getHeadToHead(homeTeamId, awayTeamId);
  const fixture = await storage.getFixture(fixtureId);

  // Try ML model first
  let mlResult = null;
  try {
    mlResult = await mlClient.predict({ fixture, homeStats, awayStats, h2h });
  } catch (e) {
    console.warn('ML model unavailable, falling back to statistical prediction.', e);
  }

  // Fallback: simple statistical prediction if ML fails
  if (!mlResult) {
    // Example: weighted average of recent form, goals, and H2H
    const homeForm = homeStats?.formRating || 0.5;
    const awayForm = awayStats?.formRating || 0.5;
    const avgGoalsHome = homeStats?.avgGoalsFor || 1.3;
    const avgGoalsAway = awayStats?.avgGoalsFor || 1.1;
    const h2hWinRate = h2h?.homeWinRate || 0.5;
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
    mlModel: mlResult.modelName || 'custom-ml-prod',
    keyFeatures: mlResult.keyFeatures || ["team_form", "head_to_head", "avg_goals"],
    explanation: mlResult.explanation || "Prediction generated using ML model with real data.",
    modelVersion: mlResult.modelVersion || "prod-1.0"
  };
}


async function updateLiveFixtures() {
  try {
    const data = await fetchFromAPIFootball('fixtures?live=all');
    
    if (data.response && Array.isArray(data.response)) {
      for (const match of data.response) {
        const fixture = {
          id: match.fixture.id,
          referee: match.fixture.referee,
          timezone: match.fixture.timezone,
          date: new Date(match.fixture.date),
          timestamp: match.fixture.timestamp,
          status: match.fixture.status.short,
          elapsed: match.fixture.status.elapsed,
          round: match.league.round,
          homeTeamId: match.teams.home.id,
          awayTeamId: match.teams.away.id,
          leagueId: match.league.id,
          venue: match.fixture.venue?.name,
          homeScore: match.goals.home,
          awayScore: match.goals.away,
          halftimeHomeScore: match.score.halftime.home,
          halftimeAwayScore: match.score.halftime.away,
        };
        
        // Update league first
        await storage.updateLeague({
          id: match.league.id,
          name: match.league.name,
          country: match.league.country,
          logo: match.league.logo,
          flag: match.league.flag,
          season: match.league.season,
          type: match.league.type || 'League'
        });
        
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
        
        await Promise.all([
          storage.updateTeam(homeTeam),
          storage.updateTeam(awayTeam)
        ]);
        
        // Update fixture after teams/league exist
        await storage.updateFixture(fixture);
        
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
  res.json(data);
}));

// Get fixtures with optional filters by league and date
fixturesRouter.get("/", asyncHandler(async (req, res) => {
  const { league, date } = req.query;
  
  // If no filters, get from storage as a fallback
  if (!league && !date) {
    const fixtures = await storage.getFixtures();
    return res.json(fixtures);
  }

  const params = new URLSearchParams();
  if (league) params.append('league', league as string);
  if (date) params.append('date', date as string);

  const endpoint = `fixtures?${params.toString()}`;
  const data = await fetchFromAPIFootball(endpoint);
  res.json(data);
}));