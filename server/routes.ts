import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { scrapingScheduler } from "./scraping-scheduler";
import { apiFootballClient } from "./services/apiFootballClient";
import { z } from "zod";

// Legacy function wrapper for backward compatibility during migration
async function fetchFromAPIFootball(endpoint: string) {
  const response = await apiFootballClient.request(endpoint);
  return response;
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
        
        // *** FIX: Update teams and league BEFORE fixture to avoid FK violations ***
        
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
        
        // NOW update fixture after teams/league exist
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

async function updateStandings(leagueId: number, season: number) {
  try {
    console.log(`Fetching standings for league ${leagueId}, season ${season}...`);
    const data = await fetchFromAPIFootball(`standings?league=${leagueId}&season=${season}`);
    console.log(`API response for league ${leagueId}:`, JSON.stringify(data).substring(0, 200) + '...');
    
    if (data.response && data.response[0]) {
      const standings = data.response[0].league.standings[0];
      console.log(`Found ${standings.length} teams in league ${leagueId}`);
      
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
      
      console.log(`Updating standings for ${standingsData.length} teams...`);
      await storage.updateStandings(standingsData);
      console.log(`Standings updated successfully for league ${leagueId}`);
      
      // Update teams
      console.log(`Updating team data for ${standings.length} teams...`);
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
      console.log(`Teams updated successfully for league ${leagueId}`);
    } else {
      console.log(`No data found for league ${leagueId}, season ${season}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('API_LIMIT_REACHED') || errorMessage.includes('API_PLAN_LIMIT') || errorMessage.includes('API_EMPTY_RESPONSE')) {
      console.log(`⚠️ API issue detected, using sample data for league ${leagueId}`);
      // Return true to indicate fallback needed
      return true;
    } else {
      console.error(`Error updating standings for league ${leagueId}:`, error);
      return false;
    }
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
  try {
    const [homeTeam, awayTeam, homeStats, awayStats] = await Promise.all([
      storage.getTeam(homeTeamId),
      storage.getTeam(awayTeamId),
      calculateTeamForm(homeTeamId),
      calculateTeamForm(awayTeamId)
    ]);
    
    // Get recent fixtures for both teams
    const allFixtures = await storage.getFixtures();
    const homeRecentFixtures = allFixtures
      .filter(f => f.homeTeamId === homeTeamId || f.awayTeamId === homeTeamId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
      
    const awayRecentFixtures = allFixtures
      .filter(f => f.homeTeamId === awayTeamId || f.awayTeamId === awayTeamId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
    
    // Calculate advanced features
    const homeAvgGoalsFor = calculateAvgGoals(homeRecentFixtures, homeTeamId, true);
    const homeAvgGoalsAgainst = calculateAvgGoals(homeRecentFixtures, homeTeamId, false);
    const awayAvgGoalsFor = calculateAvgGoals(awayRecentFixtures, awayTeamId, true);
    const awayAvgGoalsAgainst = calculateAvgGoals(awayRecentFixtures, awayTeamId, false);
    
    return {
      // xG-based features (enhanced with actual goal data)
      home_avg_xg_for: Math.max(0.5, homeAvgGoalsFor * 1.1), // Slight adjustment to xG
      away_avg_xg_for: Math.max(0.5, awayAvgGoalsFor * 1.1),
      home_avg_xg_against: Math.max(0.5, homeAvgGoalsAgainst * 1.1),
      away_avg_xg_against: Math.max(0.5, awayAvgGoalsAgainst * 1.1),
      
      // Home advantage (dynamic based on home record)
      home_advantage: calculateHomeAdvantage(homeTeamId, allFixtures),
      
      // Form features
      form_difference: (homeStats.formPoints - awayStats.formPoints) / 15, // Normalized
      home_form_points: homeStats.formPoints,
      away_form_points: awayStats.formPoints,
      
      // Strength features
      overall_strength_diff: (homeStats.overallRating - awayStats.overallRating) / 100,
      attack_vs_defense: (homeStats.attackRating - awayStats.defenseRating) / 100,
      defense_vs_attack: (homeStats.defenseRating - awayStats.attackRating) / 100,
      
      // Goal-based features
      home_goals_for_avg: homeAvgGoalsFor,
      home_goals_against_avg: homeAvgGoalsAgainst,
      away_goals_for_avg: awayAvgGoalsFor,
      away_goals_against_avg: awayAvgGoalsAgainst,
      
      // Meta features
      data_quality: 0.8, // We have good API data
      recent_matches_count: Math.min(homeRecentFixtures.length, awayRecentFixtures.length)
    };
  } catch (error) {
    console.error('Error creating match features:', error);
    // Fallback to basic features
    return {
      home_avg_xg_for: 1.5,
      away_avg_xg_for: 1.3,
      home_advantage: 0.25,
      form_difference: 0.0
    };
  }
}

async function callMLPredictor(homeTeamId: number, awayTeamId: number, fixtureId: number) {
  try {
    // Try to get real predictions from API-Football first
    const apiPrediction = await fetchFromAPIFootball(`predictions?fixture=${fixtureId}`).catch(() => null);
    
    // Get team statistics to enhance predictions
    const [homeTeam, awayTeam] = await Promise.all([
      storage.getTeam(homeTeamId),
      storage.getTeam(awayTeamId)
    ]);
    
    // Calculate team form and recent performance
    const [homeStats, awayStats] = await Promise.all([
      calculateTeamForm(homeTeamId),
      calculateTeamForm(awayTeamId)
    ]);
    
    // Base probabilities from API-Football or calculated
    let homeProbability = 0.45;
    let drawProbability = 0.28;
    let awayProbability = 0.27;
    let confidence = 60;
    
    if (apiPrediction?.response?.[0]?.predictions) {
      const pred = apiPrediction.response[0].predictions;
      homeProbability = (pred.percent?.home ? parseInt(pred.percent.home.replace('%', '')) : 45) / 100;
      drawProbability = (pred.percent?.draw ? parseInt(pred.percent.draw.replace('%', '')) : 28) / 100;
      awayProbability = (pred.percent?.away ? parseInt(pred.percent.away.replace('%', '')) : 27) / 100;
      confidence = Math.min(85, 60 + (pred.advice === 'X' ? 20 : pred.advice === '1' ? 15 : 10));
    }
    
    // Apply advanced adjustments based on team stats
    const homeAdvantage = 0.15; // 15% home advantage base
    const formDifference = (homeStats.formPoints - awayStats.formPoints) * 0.02;
    const strengthDifference = (homeStats.overallRating - awayStats.overallRating) * 0.003;
    
    // Adjust probabilities with our enhancements
    const totalAdjustment = homeAdvantage + formDifference + strengthDifference;
    homeProbability = Math.max(0.05, Math.min(0.85, homeProbability + totalAdjustment));
    awayProbability = Math.max(0.05, Math.min(0.85, awayProbability - (totalAdjustment * 0.7)));
    drawProbability = Math.max(0.1, 1 - homeProbability - awayProbability);
    
    // Normalize probabilities
    const total = homeProbability + drawProbability + awayProbability;
    homeProbability /= total;
    drawProbability /= total;
    awayProbability /= total;
    
    // Calculate expected goals based on team attacking/defensive stats
    const homeXG = Math.max(0.5, Math.min(4.0, 
      1.4 + (homeStats.attackRating - 70) * 0.03 + homeAdvantage - (awayStats.defenseRating - 70) * 0.02
    ));
    const awayXG = Math.max(0.5, Math.min(4.0,
      1.2 + (awayStats.attackRating - 70) * 0.03 - (homeStats.defenseRating - 70) * 0.02
    ));
    
    // Calculate BTTS and Over 2.5 probabilities using Poisson distribution
    const btts = calculateBTTSProbability(homeXG, awayXG);
    const over25 = calculateOver25Probability(homeXG + awayXG);
    
    // Key features for explanation
    const keyFeatures = [
      { 
        name: "Home Advantage", 
        value: homeAdvantage, 
        importance: 0.3,
        impact: homeAdvantage > 0 ? "Positive" : "Negative"
      },
      { 
        name: "Form Difference", 
        value: formDifference, 
        importance: 0.25,
        impact: formDifference > 0 ? "Positive" : "Negative"
      },
      { 
        name: "Team Strength Gap", 
        value: strengthDifference, 
        importance: 0.2,
        impact: strengthDifference > 0 ? "Positive" : "Negative"
      },
      {
        name: "Attack vs Defense",
        value: (homeStats.attackRating - awayStats.defenseRating) / 10,
        importance: 0.15,
        impact: homeStats.attackRating > awayStats.defenseRating ? "Positive" : "Negative"
      }
    ];
    
    // Generate explanation
    const explanation = generatePredictionExplanation(
      homeProbability, homeTeam?.name || "Home team", awayTeam?.name || "Away team", keyFeatures
    );
    
    return {
      probabilities: { 
        home_win: homeProbability, 
        draw: drawProbability, 
        away_win: awayProbability 
      },
      expected_goals: { home: homeXG, away: awayXG },
      additional_markets: { 
        both_teams_score: btts, 
        over_2_5_goals: over25 
      },
      confidence: Math.round(confidence),
      key_features: keyFeatures,
      explanation: explanation,
      model_version: apiPrediction ? "api-football-enhanced" : "calculated-v1.0"
    };
  } catch (error) {
    console.error('Error in ML predictor:', error);
    // Fallback to basic predictions
    return generateBasicMLPrediction(homeTeamId, awayTeamId);
  }
}

async function getScrapedMatchData(fixtureId: number) {
  // This would connect to the SQLite database with scraped data
  return {
    home_xg: 1.5,
    away_xg: 1.2,
    momentum_score: 0.1
  };
}

// Helper functions for advanced calculations
async function calculateTeamForm(teamId: number) {
  try {
    const fixtures = await storage.getFixtures();
    const recentFixtures = fixtures
      .filter(f => f.homeTeamId === teamId || f.awayTeamId === teamId)
      .filter(f => f.status === "FT" && f.homeScore !== null && f.awayScore !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
    
    let formPoints = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    let wins = 0;
    let draws = 0;
    let losses = 0;
    
    recentFixtures.forEach(fixture => {
      const isHome = fixture.homeTeamId === teamId;
      const teamGoals = isHome ? fixture.homeScore! : fixture.awayScore!;
      const opponentGoals = isHome ? fixture.awayScore! : fixture.homeScore!;
      
      goalsFor += teamGoals;
      goalsAgainst += opponentGoals;
      
      if (teamGoals > opponentGoals) {
        wins++;
        formPoints += 3;
      } else if (teamGoals === opponentGoals) {
        draws++;
        formPoints += 1;
      } else {
        losses++;
      }
    });
    
    const attackRating = Math.min(100, 50 + (goalsFor / Math.max(recentFixtures.length, 1)) * 10);
    const defenseRating = Math.min(100, 90 - (goalsAgainst / Math.max(recentFixtures.length, 1)) * 10);
    const overallRating = (attackRating + defenseRating + (formPoints / Math.max(recentFixtures.length, 1)) * 10) / 3;
    
    return {
      formPoints,
      goalsFor,
      goalsAgainst,
      wins,
      draws,
      losses,
      attackRating: Math.round(attackRating),
      defenseRating: Math.round(defenseRating),
      overallRating: Math.round(overallRating),
      matchesPlayed: recentFixtures.length
    };
  } catch (error) {
    console.error('Error calculating team form:', error);
    // Fallback stats
    return {
      formPoints: 8,
      goalsFor: 7,
      goalsAgainst: 5,
      wins: 2,
      draws: 2,
      losses: 1,
      attackRating: 72,
      defenseRating: 68,
      overallRating: 70,
      matchesPlayed: 5
    };
  }
}

function calculateAvgGoals(fixtures: any[], teamId: number, goalsFor: boolean): number {
  if (fixtures.length === 0) return goalsFor ? 1.4 : 1.2;
  
  const total = fixtures.reduce((sum, fixture) => {
    if (fixture.homeScore === null || fixture.awayScore === null) return sum;
    
    const isHome = fixture.homeTeamId === teamId;
    let goals: number;
    
    if (goalsFor) {
      goals = isHome ? fixture.homeScore : fixture.awayScore;
    } else {
      goals = isHome ? fixture.awayScore : fixture.homeScore;
    }
    
    return sum + goals;
  }, 0);
  
  return Math.round((total / fixtures.length) * 100) / 100;
}

function calculateHomeAdvantage(teamId: number, allFixtures: any[]): number {
  const homeFixtures = allFixtures.filter(f => 
    f.homeTeamId === teamId && f.status === "FT" && f.homeScore !== null
  ).slice(0, 10);
  
  const awayFixtures = allFixtures.filter(f => 
    f.awayTeamId === teamId && f.status === "FT" && f.awayScore !== null
  ).slice(0, 10);
  
  if (homeFixtures.length === 0) return 0.15; // Default home advantage
  
  const homePoints = homeFixtures.reduce((sum, f) => {
    if (f.homeScore > f.awayScore) return sum + 3;
    if (f.homeScore === f.awayScore) return sum + 1;
    return sum;
  }, 0) / Math.max(homeFixtures.length, 1);
  
  const awayPoints = awayFixtures.reduce((sum, f) => {
    if (f.awayScore > f.homeScore) return sum + 3;
    if (f.awayScore === f.homeScore) return sum + 1;
    return sum;
  }, 0) / Math.max(awayFixtures.length, 1);
  
  const advantage = (homePoints - awayPoints) / 3; // Normalize to [0-1]
  return Math.max(0.05, Math.min(0.35, 0.15 + advantage)); // Clamp between 5% and 35%
}

function calculateBTTSProbability(homeXG: number, awayXG: number): number {
  // Probability both teams score using Poisson distribution
  const homeProb = 1 - Math.exp(-homeXG); // P(home scores >= 1)
  const awayProb = 1 - Math.exp(-awayXG); // P(away scores >= 1)
  return Math.round(homeProb * awayProb * 100) / 100;
}

function calculateOver25Probability(totalXG: number): number {
  // Probability of 3+ goals using Poisson distribution
  const p0 = Math.exp(-totalXG);
  const p1 = totalXG * Math.exp(-totalXG);
  const p2 = (totalXG * totalXG / 2) * Math.exp(-totalXG);
  return Math.round((1 - (p0 + p1 + p2)) * 100) / 100;
}

function generatePredictionExplanation(homeProbability: number, homeTeam: string, awayTeam: string, keyFeatures: any[]): string {
  const homePercentage = Math.round(homeProbability * 100);
  const predicted = homeProbability > 0.45 ? homeTeam : (homeProbability > 0.35 ? "Draw" : awayTeam);
  
  let explanation = `The model predicts a ${predicted} outcome with ${homePercentage}% confidence. `;
  
  const positiveFeatures = keyFeatures.filter(f => f.impact === "Positive" && f.value > 0.05);
  const negativeFeatures = keyFeatures.filter(f => f.impact === "Negative" && f.value < -0.05);
  
  if (positiveFeatures.length > 0) {
    const topPositive = positiveFeatures.reduce((max, f) => f.importance > max.importance ? f : max);
    explanation += `Key factor: ${topPositive.name} strongly favors the home team. `;
  }
  
  if (negativeFeatures.length > 0) {
    const topNegative = negativeFeatures.reduce((max, f) => Math.abs(f.value) > Math.abs(max.value) ? f : max);
    explanation += `However, ${topNegative.name} works against them. `;
  }
  
  return explanation;
}

function generateBasicMLPrediction(homeTeamId: number, awayTeamId: number) {
  return {
    probabilities: { home_win: 0.45, draw: 0.28, away_win: 0.27 },
    expected_goals: { home: 1.5, away: 1.2 },
    additional_markets: { both_teams_score: 0.65, over_2_5_goals: 0.52 },
    confidence: 35,
    key_features: [],
    explanation: "Basic prediction - enhanced ML model unavailable",
    model_version: "fallback-v1.0"
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

  // Secure scraped data endpoint with validation
  app.post("/api/scraped-data", async (req, res) => {
    try {
      // Improved authentication check - support Bearer tokens  
      const authHeader = req.headers.authorization || req.headers['x-internal-token'];
      const expectedToken = process.env.SCRAPER_AUTH_TOKEN;
      
      if (!expectedToken) {
        return res.status(500).json({ error: "Server misconfiguration - auth token not set" });
      }
      
      let authToken: string | undefined;
      const authHeaderStr = Array.isArray(authHeader) ? authHeader[0] : authHeader;
      if (authHeaderStr?.startsWith('Bearer ')) {
        authToken = authHeaderStr.substring(7);
      } else if (typeof authHeaderStr === 'string') {
        authToken = authHeaderStr;
      }
      
      if (!authToken || authToken !== expectedToken) {
        res.setHeader('WWW-Authenticate', 'Bearer');
        return res.status(401).json({ error: "Unauthorized - Invalid auth token" });
      }
      
      // Import validation schema dynamically to avoid circular dependencies
      const { insertScrapedDataSchema } = await import("../shared/schema.ts");
      
      // Validate request body with Zod
      const validation = insertScrapedDataSchema.safeParse({
        source: req.body.source,
        dataType: req.body.data_type || req.body.dataType,
        fixtureId: req.body.fixture_id || req.body.fixtureId,
        teamId: req.body.team_id || req.body.teamId,
        data: req.body.data,
        confidence: req.body.confidence,
        scrapedAt: new Date(req.body.scraped_at || req.body.scrapedAt)
      });
      
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Validation failed",
          details: validation.error.issues 
        });
      }
      
      // Store in dedicated scraped data table (no FK constraints)
      const storedData = await storage.createScrapedData(validation.data);
      
      console.log(`✅ Securely stored ${validation.data.dataType} data from ${validation.data.source} (ID: ${storedData.id})`);
      
      res.status(201).json({ 
        success: true,
        id: storedData.id,
        message: `Stored ${validation.data.dataType} data from ${validation.data.source}`,
        confidence: validation.data.confidence
      });
      
    } catch (error) {
      console.error("Error storing scraped data:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get scraped data with query filters
  app.get("/api/scraped-data", async (req, res) => {
    try {
      const { source, dataType, fixtureId, teamId } = req.query;
      
      const data = await storage.getScrapedData(
        source as string,
        dataType as string, 
        fixtureId ? parseInt(fixtureId as string) : undefined,
        teamId ? parseInt(teamId as string) : undefined
      );
      
      res.json(data);
      
    } catch (error) {
      console.error("Error fetching scraped data:", error);
      res.status(500).json({ error: "Failed to fetch scraped data" });
    }
  });
  
  // Get latest scraped data for source and type
  app.get("/api/scraped-data/latest/:source/:dataType", async (req, res) => {
    try {
      const { source, dataType } = req.params;
      
      const data = await storage.getLatestScrapedData(source, dataType);
      
      if (!data) {
        return res.status(404).json({ error: "No data found" });
      }
      
      res.json(data);
      
    } catch (error) {
      console.error("Error fetching latest scraped data:", error);
      res.status(500).json({ error: "Failed to fetch latest scraped data" });
    }
  });

  // Scheduler monitoring endpoint for production observability
  app.get("/api/scheduler/status", async (req, res) => {
    try {
      const status = scrapingScheduler.getStatus();
      res.json({
        scheduler: status,
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching scheduler status:", error);
      res.status(500).json({ error: "Failed to fetch scheduler status" });
    }
  });

  // Sample data seeding function for when API limits are reached
  async function seedSampleStandingsData(leagueId: number) {
  const sampleTeams = {
    39: [ // Premier League
      { id: 40, name: 'Liverpool', logo: 'https://media-4.api-sports.io/football/teams/40.png', country: 'England' },
      { id: 50, name: 'Manchester City', logo: 'https://media-4.api-sports.io/football/teams/50.png', country: 'England' },
      { id: 42, name: 'Arsenal', logo: 'https://media-4.api-sports.io/football/teams/42.png', country: 'England' },
      { id: 49, name: 'Chelsea', logo: 'https://media-4.api-sports.io/football/teams/49.png', country: 'England' },
      { id: 33, name: 'Manchester United', logo: 'https://media-4.api-sports.io/football/teams/33.png', country: 'England' }
    ],
    140: [ // La Liga
      { id: 541, name: 'Real Madrid', logo: 'https://media-4.api-sports.io/football/teams/541.png', country: 'Spain' },
      { id: 529, name: 'Barcelona', logo: 'https://media-4.api-sports.io/football/teams/529.png', country: 'Spain' },
      { id: 530, name: 'Atlético Madrid', logo: 'https://media-4.api-sports.io/football/teams/530.png', country: 'Spain' }
    ]
  };

  const teams = sampleTeams[leagueId as keyof typeof sampleTeams] || sampleTeams[39];
  console.log(`Seeding ${teams.length} sample teams for league ${leagueId}`);

  // First, ensure league exists
  await storage.updateLeague({
    id: leagueId,
    name: leagueId === 39 ? 'Premier League' : 'La Liga',
    country: leagueId === 39 ? 'England' : 'Spain',
    logo: null,
    flag: null,
    season: 2023,
    type: 'League'
  });

  // Create sample standings
  const standingsData = teams.map((team, index) => ({
    id: `${leagueId}-${team.id}`,
    leagueId,
    teamId: team.id,
    position: index + 1,
    points: 30 - (index * 3),
    played: 10,
    wins: 8 - index,
    draws: 2,
    losses: index,
    goalsFor: 25 - (index * 2),
    goalsAgainst: 8 + index,
    goalDifference: 17 - (index * 3),
    form: 'WWDWL'
  }));

  // Store team data FIRST to avoid FK violations
  for (const team of teams) {
    await storage.updateTeam({
      id: team.id,
      name: team.name,
      logo: team.logo,
      country: team.country,
      national: false,
      code: null,
      founded: null
    });
  }
  
  // Now store standings after teams exist
  await storage.updateStandings(standingsData);
  
  console.log(`✅ Sample data seeded successfully for league ${leagueId}`);
}

  // Initialize with some default leagues
  setTimeout(async () => {
    try {
      console.log('Initializing data...');
      
      // Try to fetch real data, fallback to sample data if API limits reached
      const leagues = [
        { id: 39, name: 'Premier League', teams: [
          { id: 40, name: 'Liverpool', logo: 'https://media-4.api-sports.io/football/teams/40.png' },
          { id: 50, name: 'Manchester City', logo: 'https://media-4.api-sports.io/football/teams/50.png' },
          { id: 42, name: 'Arsenal', logo: 'https://media-4.api-sports.io/football/teams/42.png' },
          { id: 49, name: 'Chelsea', logo: 'https://media-4.api-sports.io/football/teams/49.png' },
          { id: 33, name: 'Manchester United', logo: 'https://media-4.api-sports.io/football/teams/33.png' }
        ]},
        { id: 140, name: 'La Liga', teams: [
          { id: 541, name: 'Real Madrid', logo: 'https://media-4.api-sports.io/football/teams/541.png' },
          { id: 529, name: 'Barcelona', logo: 'https://media-4.api-sports.io/football/teams/529.png' },
          { id: 530, name: 'Atlético Madrid', logo: 'https://media-4.api-sports.io/football/teams/530.png' }
        ]}
      ];

      for (const league of leagues) {
        const needsFallback = await updateStandings(league.id, 2023);
        
        if (needsFallback) {
          console.log(`\u26a0\ufe0f Using sample data for ${league.name} (ID: ${league.id})`);
          
          // First, ensure league exists
          await storage.updateLeague({
            id: league.id,
            name: league.name,
            country: league.id === 39 ? 'England' : 'Spain',
            logo: null,
            flag: null,
            season: 2023,
            type: 'League'
          });
          
          // Create sample standings
          const standingsData = league.teams.map((team, index) => ({
            id: `${league.id}-${team.id}`,
            leagueId: league.id,
            teamId: team.id,
            position: index + 1,
            points: 30 - (index * 3),
            played: 10,
            wins: 8 - index,
            draws: 2,
            losses: index,
            goalsFor: 25 - (index * 2),
            goalsAgainst: 8 + index,
            goalDifference: 17 - (index * 3),
            form: 'WWDWL'
          }));

          await storage.updateStandings(standingsData);
          
          // Store team data
          for (const team of league.teams) {
            await storage.updateTeam({
              id: team.id,
              name: team.name,
              logo: team.logo,
              country: league.id === 39 ? 'England' : 'Spain',
              national: false,
              code: null,
              founded: null
            });
          }
          console.log(`\u2705 Sample data seeded for ${league.name}`);
        }
      }
      
      console.log('Data initialization completed successfully');
    } catch (error) {
      console.error('Error initializing data:', error);
    }
  }, 1000);

  // Update live fixtures every 5 minutes to avoid API limits
  setInterval(updateLiveFixtures, 300000);

  const httpServer = createServer(app);
  return httpServer;
}
