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

async function generateMLPredictions(fixtureId: number, homeTeamId: number, awayTeamId: number) {
  // Enhanced ML prediction logic placeholder
  return {
    id: `ml-pred-${fixtureId}`,
    fixtureId,
    homeWinProbability: "42",
    drawProbability: "25", 
    awayWinProbability: "33",
    expectedGoalsHome: "1.8",
    expectedGoalsAway: "1.4",
    bothTeamsScore: "68",
    over25Goals: "58",
    confidence: "78",
    createdAt: new Date(),
    mlModel: "xgboost-v2.1",
    keyFeatures: ["team_form", "head_to_head"] as string[],
    explanation: "Basic prediction - enhanced ML model unavailable",
    modelVersion: "fallback-v1.0"
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

// Get live fixtures
fixturesRouter.get("/live", asyncHandler(async (req, res) => {
  await updateLiveFixtures();
  const fixtures = await storage.getLiveFixtures();
  res.json(fixtures);
}));

// Get fixtures for a league
fixturesRouter.get("/", asyncHandler(async (req, res) => {
  const leagueId = req.query.league ? parseInt(req.query.league as string) : undefined;
  const fixtures = await storage.getFixtures(leagueId);
  res.json(fixtures);
}));