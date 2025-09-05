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
        
        // Update teams if not exists
        await storage.updateTeam({
          id: match.teams.home.id,
          name: match.teams.home.name,
          logo: match.teams.home.logo,
          country: match.league.country,
          national: false,
          code: null,
          founded: null
        });
        
        await storage.updateTeam({
          id: match.teams.away.id,
          name: match.teams.away.name,
          logo: match.teams.away.logo,
          country: match.league.country,
          national: false,
          code: null,
          founded: null
        });
        
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

async function generatePredictions(fixtureId: number) {
  try {
    const data = await fetchFromAPIFootball(`predictions?fixture=${fixtureId}`);
    
    if (data.response && data.response[0]) {
      const pred = data.response[0].predictions;
      const prediction = {
        id: `pred-${fixtureId}`,
        fixtureId,
        homeWinProbability: pred.percent.home,
        drawProbability: pred.percent.draw,
        awayWinProbability: pred.percent.away,
        expectedGoalsHome: "2.1",
        expectedGoalsAway: "1.4",
        bothTeamsScore: "65",
        over25Goals: "72",
        confidence: "78",
        createdAt: new Date()
      };
      
      await storage.updatePrediction(prediction);
    }
  } catch (error) {
    console.error('Error generating predictions:', error);
  }
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
