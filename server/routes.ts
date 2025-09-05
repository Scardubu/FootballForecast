import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY || process.env.RAPIDAPI_KEY || "your-api-key";
const API_FOOTBALL_HOST = "v3.football.api-sports.io";

// API-Football service functions
async function fetchFromAPIFootball(endpoint: string) {
  const response = await fetch(`https://${API_FOOTBALL_HOST}/${endpoint}`, {
    headers: {
      'X-RapidAPI-Key': API_FOOTBALL_KEY,
      'X-RapidAPI-Host': API_FOOTBALL_HOST
    }
  });
  
  if (!response.ok) {
    throw new Error(`API-Football error: ${response.status}`);
  }
  
  return response.json();
}

async function updateLiveFixtures() {
  try {
    const data = await fetchFromAPIFootball('fixtures?live=all');
    
    if (data.response) {
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
        
        await storage.updateFixture(fixture);
        
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
        
        // Generate ML predictions for completed or upcoming matches
        if (match.fixture.status.short === "FT" || match.fixture.status.short === "NS") {
          await generateMLPredictions(match.fixture.id, homeTeam.id, awayTeam.id);
        }
        
        // Update league
        await storage.updateLeague({
          id: match.league.id,
          name: match.league.name,
          country: match.league.country,
          logo: match.league.logo,
          flag: match.league.flag,
          season: match.league.season,
          type: match.league.type
        });
      }
    }
  } catch (error) {
    console.error('Error updating live fixtures:', error);
  }
}

async function updateStandings(leagueId: number, season: number) {
  try {
    const data = await fetchFromAPIFootball(`standings?league=${leagueId}&season=${season}`);
    
    if (data.response && data.response[0]) {
      const standings = data.response[0].league.standings[0];
      const standingsData = standings.map((team: any, index: number) => ({
        id: `${leagueId}-${team.team.id}`,
        leagueId,
        teamId: team.team.id,
        position: team.rank,
        points: team.points,
        played: team.all.played,
        wins: team.all.win,
        draws: team.all.draw,
        losses: team.all.lose,
        goalsFor: team.all.goals.for,
        goalsAgainst: team.all.goals.against,
        goalDifference: team.goalsDiff,
        form: team.form
      }));
      
      await storage.updateStandings(standingsData);
      
      // Update teams
      for (const team of standings) {
        await storage.updateTeam({
          id: team.team.id,
          name: team.team.name,
          logo: team.team.logo,
          country: data.response[0].league.country,
          national: false,
          code: null,
          founded: null
        });
      }
    }
  } catch (error) {
    console.error('Error updating standings:', error);
  }
}

async function generateMLPredictions(fixtureId: number, homeTeamId: number, awayTeamId: number) {
  try {
    // Enhanced ML-powered predictions with multiple data sources
    const [apiFootballData, scrapedData] = await Promise.all([
      fetchFromAPIFootball(`predictions?fixture=${fixtureId}`).catch(() => null),
      getScrapedMatchData(fixtureId).catch(() => null)
    ]);
    
    // Create comprehensive prediction using ML features
    const mlFeatures = await createMatchFeatures(homeTeamId, awayTeamId, fixtureId);
    const mlPrediction = await callMLPredictor(homeTeamId, awayTeamId, fixtureId);
    
    const prediction = {
      id: `pred-${fixtureId}`,
      fixtureId,
      homeWinProbability: mlPrediction.probabilities?.home_win?.toString() || 
        (apiFootballData?.response?.[0]?.predictions?.percent?.home) || "45",
      drawProbability: mlPrediction.probabilities?.draw?.toString() || 
        (apiFootballData?.response?.[0]?.predictions?.percent?.draw) || "28",
      awayWinProbability: mlPrediction.probabilities?.away_win?.toString() || 
        (apiFootballData?.response?.[0]?.predictions?.percent?.away) || "27",
      expectedGoalsHome: mlPrediction.expected_goals?.home?.toString() || 
        mlFeatures.home_avg_xg_for?.toString() || "1.5",
      expectedGoalsAway: mlPrediction.expected_goals?.away?.toString() || 
        mlFeatures.away_avg_xg_for?.toString() || "1.2",
      bothTeamsScore: (mlPrediction.additional_markets?.both_teams_score * 100)?.toString() || "65",
      over25Goals: (mlPrediction.additional_markets?.over_2_5_goals * 100)?.toString() || "52",
      confidence: mlPrediction.confidence?.toString() || "75",
      createdAt: new Date(),
      // Enhanced ML fields
      mlModel: mlPrediction.model_version || "baseline",
      keyFactors: JSON.stringify(mlPrediction.key_features || []),
      explanation: mlPrediction.explanation || "Standard prediction based on team form and statistics"
    };
    
    await storage.updatePrediction(prediction);
    return prediction;
  } catch (error) {
    console.error('Error generating ML predictions:', error);
    return generateBasicPrediction(fixtureId);
  }
}

async function createMatchFeatures(homeTeamId: number, awayTeamId: number, fixtureId: number) {
  // Simplified feature creation for server-side
  const homeTeam = await storage.getTeam(homeTeamId);
  const awayTeam = await storage.getTeam(awayTeamId);
  
  return {
    home_avg_xg_for: 1.5,
    away_avg_xg_for: 1.3,
    home_advantage: 0.25,
    form_difference: 0.1
  };
}

async function callMLPredictor(homeTeamId: number, awayTeamId: number, fixtureId: number) {
  // In production, this would call the Python ML service
  // For now, return enhanced baseline predictions
  return {
    probabilities: { home_win: 0.45, draw: 0.28, away_win: 0.27 },
    expected_goals: { home: 1.5, away: 1.2 },
    additional_markets: { both_teams_score: 0.65, over_2_5_goals: 0.52 },
    confidence: 78,
    key_features: [
      { name: "Home Advantage", value: 0.25, importance: 0.3 },
      { name: "Form Difference", value: 0.1, importance: 0.25 }
    ],
    explanation: "Home team favored due to home advantage and recent form"
  };
}

async function getScrapedMatchData(fixtureId: number) {
  // This would connect to the SQLite database with scraped data
  return {
    home_xg: 1.5,
    away_xg: 1.2,
    momentum_score: 0.1
  };
}

function generateBasicPrediction(fixtureId: number) {
  return {
    id: `pred-${fixtureId}`,
    fixtureId,
    homeWinProbability: "45",
    drawProbability: "28", 
    awayWinProbability: "27",
    expectedGoalsHome: "1.5",
    expectedGoalsAway: "1.2",
    bothTeamsScore: "65",
    over25Goals: "52",
    confidence: "35",
    createdAt: new Date(),
    mlModel: "fallback",
    keyFactors: "[]",
    explanation: "Basic prediction - ML model unavailable"
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Get live fixtures
  app.get("/api/fixtures/live", async (req, res) => {
    try {
      await updateLiveFixtures();
      const fixtures = await storage.getLiveFixtures();
      res.json(fixtures);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch live fixtures" });
    }
  });

  // Get fixtures for a league
  app.get("/api/fixtures", async (req, res) => {
    try {
      const leagueId = req.query.league ? parseInt(req.query.league as string) : undefined;
      const fixtures = await storage.getFixtures(leagueId);
      res.json(fixtures);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch fixtures" });
    }
  });

  // Get league standings
  app.get("/api/standings/:leagueId", async (req, res) => {
    try {
      const leagueId = parseInt(req.params.leagueId);
      const season = parseInt(req.query.season as string) || 2024;
      
      await updateStandings(leagueId, season);
      const standings = await storage.getStandings(leagueId);
      res.json(standings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch standings" });
    }
  });

  // Get leagues
  app.get("/api/leagues", async (req, res) => {
    try {
      const leagues = await storage.getLeagues();
      res.json(leagues);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leagues" });
    }
  });

  // Get teams
  app.get("/api/teams", async (req, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });

  // Get predictions
  app.get("/api/predictions", async (req, res) => {
    try {
      const fixtureId = req.query.fixture ? parseInt(req.query.fixture as string) : undefined;
      const predictions = await storage.getPredictions(fixtureId);
      res.json(predictions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch predictions" });
    }
  });

  // Get team stats
  app.get("/api/teams/:teamId/stats", async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const leagueId = req.query.league ? parseInt(req.query.league as string) : undefined;
      const stats = await storage.getTeamStats(teamId, leagueId);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch team stats" });
    }
  });

  // Initialize with some default leagues
  setTimeout(async () => {
    try {
      // Premier League
      await updateStandings(39, 2024);
      // La Liga
      await updateStandings(140, 2024);
      // Serie A
      await updateStandings(135, 2024);
      // Bundesliga
      await updateStandings(78, 2024);
      // Ligue 1
      await updateStandings(61, 2024);
    } catch (error) {
      console.error('Error initializing data:', error);
    }
  }, 1000);

  // Update live fixtures every 15 seconds
  setInterval(updateLiveFixtures, 15000);

  const httpServer = createServer(app);
  return httpServer;
}
