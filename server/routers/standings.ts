import { Router } from "express";
import { asyncHandler, strictRateLimit } from "../middleware";
import { storage } from "../storage";
import { apiFootballClient } from "../services/apiFootballClient";

export const standingsRouter = Router();

// Legacy function wrapper for backward compatibility during migration
async function fetchFromAPIFootball(endpoint: string) {
  const response = await apiFootballClient.request(endpoint);
  return response;
}

async function updateStandings(leagueId: number, season: number) {
  try {
    console.log(`Fetching standings for league ${leagueId}, season ${season}...`);
    const data = await fetchFromAPIFootball(`standings?league=${leagueId}&season=${season}`);
    console.log(`API response for league ${leagueId}:`, JSON.stringify(data).substring(0, 200) + '...');
    
    if (data.response && Array.isArray(data.response) && data.response.length > 0 && data.response[0]?.league?.standings) {
      const leagueData = data.response[0].league;
      const standings = leagueData.standings[0];
      console.log(`Found ${standings.length} teams in league ${leagueId}`);
      
      // First, ensure league exists to prevent FK constraint violations
      await storage.updateLeague({
        id: leagueData.id,
        name: leagueData.name,
        country: leagueData.country,
        logo: leagueData.logo || null,
        flag: leagueData.flag || null,
        season: season,
        type: leagueData.type || 'League'
      });
      
      // Next, ensure all teams exist to prevent FK constraint violations
      const teamsData = standings.map((team: any) => ({
        id: team.team.id,
        name: team.team.name,
        logo: team.team.logo || null,
        country: leagueData.country,
        national: false,
        code: team.team.code || null,
        founded: team.team.founded || null
      }));
      
      await storage.updateTeams(teamsData);
      
      // Finally, insert standings after ensuring dependencies exist
      const standingsData = standings.map((team: any) => ({
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
        form: team.form || 'WWDWL'
      }));

      await storage.updateStandings(standingsData);
      console.log(`✅ Updated standings for league ${leagueId}`);
      return false;
    } else {
      console.log(`⚠️ No standings data for league ${leagueId}, API might be rate limited`);
      return true; // Indicate fallback needed
    }
  } catch (error) {
    console.error(`Error fetching standings for league ${leagueId}:`, error);
    return true; // Indicate fallback needed  
  }
}

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

// Proxy endpoint for standings with query parameters
standingsRouter.get('/', asyncHandler(async (req, res) => {
  const { league, season } = req.query;
  if (!league || !season) {
    return res.status(400).json({ error: 'league and season query parameters are required' });
  }
  const data = await fetchFromAPIFootball(`standings?league=${league}&season=${season}`);
  res.json(data);
}));

// Get league standings with strict rate limiting
standingsRouter.get("/:leagueId", strictRateLimit, asyncHandler(async (req, res) => {
  const leagueId = parseInt(req.params.leagueId);
  const season = parseInt(req.query.season as string) || 2024;
  
  await updateStandings(leagueId, season);
  const standings = await storage.getStandings(leagueId);
  res.json(standings);
}));