// Mock data provider for offline mode
// This file provides mock data when the server is unavailable

// Simple ID generator to replace nanoid dependency
const generateId = () => Math.random().toString(36).substring(2, 15);

// Types matching the real schema
interface Team {
  id: number;
  name: string;
  code: string | null;
  country: string | null;
  founded: number | null;
  national: boolean | null;
  logo: string | null;
}

interface Fixture {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  homeScore?: number;
  awayScore?: number;
  date: string;
  leagueId: number;
  status: string;
  elapsed?: number;
  round?: string;
  venue?: string;
  referee?: string;
  timezone?: string;
  timestamp?: number;
}

interface League {
  id: number;
  name: string;
  country: string;
  logo?: string;
  flag?: string;
  season: number;
  type: string;
}

interface Standing {
  id?: number;
  position: number;
  teamId: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form?: string[];
}

// Mock data with proper IDs and structure
const mockTeams: Team[] = [
  { id: 1, name: 'Arsenal', code: 'ARS', country: 'England', founded: 1886, national: false, logo: '/assets/teams/arsenal.svg' },
  { id: 2, name: 'Chelsea', code: 'CHE', country: 'England', founded: 1905, national: false, logo: '/assets/teams/chelsea.svg' },
  { id: 3, name: 'Manchester City', code: 'MCI', country: 'England', founded: 1880, national: false, logo: '/assets/teams/man-city.svg' },
  { id: 4, name: 'Liverpool', code: 'LIV', country: 'England', founded: 1892, national: false, logo: '/assets/teams/liverpool.svg' },
  { id: 5, name: 'Barcelona', code: 'BAR', country: 'Spain', founded: 1899, national: false, logo: '/assets/teams/barcelona.svg' },
  { id: 6, name: 'Real Madrid', code: 'RMA', country: 'Spain', founded: 1902, national: false, logo: '/assets/teams/real-madrid.svg' },
  { id: 7, name: 'Manchester United', code: 'MUN', country: 'England', founded: 1878, national: false, logo: '/assets/teams/man-united.svg' },
  { id: 8, name: 'Tottenham', code: 'TOT', country: 'England', founded: 1882, national: false, logo: '/assets/teams/tottenham.svg' }
];

const mockLeagues: League[] = [
  { id: 39, name: 'Premier League', country: 'England', season: 2024, type: 'League', logo: '/assets/leagues/premier-league.svg' },
  { id: 140, name: 'La Liga', country: 'Spain', season: 2024, type: 'League', logo: '/assets/leagues/laliga.svg' },
  { id: 78, name: 'Bundesliga', country: 'Germany', season: 2024, type: 'League', logo: '/assets/leagues/bundesliga.svg' },
  { id: 135, name: 'Serie A', country: 'Italy', season: 2024, type: 'League', logo: '/assets/leagues/serie-a.svg' },
  { id: 61, name: 'Ligue 1', country: 'France', season: 2024, type: 'League', logo: '/assets/leagues/ligue-1.svg' }
];

const mockFixtures: Fixture[] = [
  {
    id: 1001,
    homeTeamId: 1, // Arsenal
    awayTeamId: 2, // Chelsea
    date: new Date(Date.now() + 3600000).toISOString(),
    leagueId: 39, // Premier League
    status: 'NS', // Not Started
    round: 'Regular Season - 10',
    venue: 'Emirates Stadium'
  },
  {
    id: 1002,
    homeTeamId: 3, // Manchester City
    awayTeamId: 4, // Liverpool
    homeScore: 2,
    awayScore: 2,
    date: new Date().toISOString(),
    leagueId: 39, // Premier League
    status: '2H', // Second Half
    elapsed: 67,
    round: 'Regular Season - 10',
    venue: 'Etihad Stadium'
  },
  {
    id: 1003,
    homeTeamId: 5, // Barcelona
    awayTeamId: 6, // Real Madrid
    homeScore: 3,
    awayScore: 1,
    date: new Date(Date.now() - 3600000).toISOString(),
    leagueId: 140, // La Liga
    status: 'FT', // Full Time
    round: 'Regular Season - 11',
    venue: 'Camp Nou'
  }
];

const mockStandings: Standing[] = [
  { id: 1, position: 1, teamId: 3, played: 10, won: 8, drawn: 1, lost: 1, goalsFor: 25, goalsAgainst: 8, points: 25, form: ['W', 'W', 'D', 'W', 'W'] },
  { id: 2, position: 2, teamId: 4, played: 10, won: 7, drawn: 2, lost: 1, goalsFor: 24, goalsAgainst: 10, points: 23, form: ['W', 'W', 'W', 'D', 'L'] },
  { id: 3, position: 3, teamId: 2, played: 10, won: 7, drawn: 1, lost: 2, goalsFor: 22, goalsAgainst: 9, points: 22, form: ['W', 'L', 'W', 'W', 'W'] },
  { id: 4, position: 4, teamId: 1, played: 10, won: 6, drawn: 2, lost: 2, goalsFor: 18, goalsAgainst: 11, points: 20, form: ['D', 'W', 'W', 'W', 'L'] }
];

const mockStats = {
  dataQuality: {
    xgDataCoverage: 95,
    teamFormData: 88,
    injuryReports: 76,
    h2hHistory: 92
  },
  modelPerformance: {
    accuracy: 82.4,
    predictions: 1247,
    correct: 1027,
    incorrect: 220
  }
};

// Mock data provider
export const MockDataProvider = {
  isOfflineMode: () => {
    return localStorage.getItem('serverStatus') === 'offline' || window.isServerOffline === true;
  },
  
  // Synchronous team lookup for immediate access
  getTeamById: (teamId: number): Team | undefined => {
    return mockTeams.find(team => team.id === teamId);
  },
  
  getTeams: async (): Promise<Team[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 200));
    return mockTeams;
  },
  
  getLeagues: async (): Promise<League[]> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockLeagues;
  },
  
  getLiveFixtures: async (): Promise<Fixture[]> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    return mockFixtures.filter(fixture => fixture.status === '2H' || fixture.status === '1H' || fixture.status === 'HT');
  },
  
  getAllFixtures: async (): Promise<Fixture[]> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockFixtures;
  },
  
  getStandings: async (leagueId?: string): Promise<Standing[]> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return mockStandings;
  },
  
  getStats: async (): Promise<any> => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockStats;
  },

  // Generate realistic prediction for a fixture
  getPrediction: async (fixtureId: number): Promise<any> => {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // Find the fixture to get team info
    const fixture = mockFixtures.find(f => f.id === fixtureId);
    if (!fixture) {
      throw new Error('Fixture not found');
    }

    const homeTeam = mockTeams.find(t => t.id === fixture.homeTeamId);
    const awayTeam = mockTeams.find(t => t.id === fixture.awayTeamId);
    
    // Generate realistic probabilities based on team strength
    const homeStrength = homeTeam ? (homeTeam.id <= 4 ? 0.65 : 0.45) : 0.45;
    const awayStrength = awayTeam ? (awayTeam.id <= 4 ? 0.55 : 0.35) : 0.35;
    
    // Add some randomness and home advantage
    const homeAdvantage = 0.15;
    const totalStrength = homeStrength + awayStrength + homeAdvantage;
    
    const homeWinProb = Math.min(0.75, Math.max(0.25, (homeStrength + homeAdvantage) / totalStrength * 100));
    const awayWinProb = Math.min(0.65, Math.max(0.15, awayStrength / totalStrength * 100));
    const drawProb = Math.max(0.15, 100 - homeWinProb - awayWinProb);
    
    // Normalize to 100%
    const total = homeWinProb + drawProb + awayWinProb;
    const normalizedHome = Math.round((homeWinProb / total) * 100);
    const normalizedDraw = Math.round((drawProb / total) * 100);
    const normalizedAway = Math.round((awayWinProb / total) * 100);
    
    // Generate expected goals
    const homeXG = Math.round((1.2 + Math.random() * 1.0) * 10) / 10;
    const awayXG = Math.round((1.0 + Math.random() * 0.8) * 10) / 10;
    
    const predictedOutcome = (() => {
      const maxProb = Math.max(normalizedHome, normalizedAway, normalizedDraw);
      if (maxProb === normalizedHome) return "home";
      if (maxProb === normalizedAway) return "away";
      return "draw";
    })();

    const latencyMs = Math.round(180 + Math.random() * 120);
    const serviceLatencyMs = Math.round(45 + Math.random() * 25);

    return {
      id: `pred-${fixtureId}-${Date.now()}`,
      fixtureId: fixtureId,
      homeWinProbability: normalizedHome.toString(),
      drawProbability: normalizedDraw.toString(),
      awayWinProbability: normalizedAway.toString(),
      expectedGoalsHome: homeXG.toString(),
      expectedGoalsAway: awayXG.toString(),
      bothTeamsScore: Math.round((55 + Math.random() * 30)).toString(),
      over25Goals: Math.round((40 + Math.random() * 35)).toString(),
      confidence: Math.round((70 + Math.random() * 25)).toString(),
      createdAt: new Date(),
      mlModel: "mock-v1.0",
      predictedOutcome,
      latencyMs,
      serviceLatencyMs,
      modelCalibrated: true,
      modelTrained: true,
      calibrationMetadata: {
        method: "temperature-scaling",
        temperature: 1.08,
        applied: true,
      },
      aiInsight: `Based on recent form and historical data, ${homeTeam?.name || 'the home team'} has a ${normalizedHome}% chance of winning. Key factors include home advantage and recent performance trends.`
    };
  },

  getPredictionTelemetry: async (fixtureIds?: number[]): Promise<Record<number, any>> => {
    const ids = fixtureIds && fixtureIds.length > 0
      ? fixtureIds
      : (await MockDataProvider.getAllFixtures()).slice(0, 5).map(fixture => fixture.id);

    const telemetry: Record<number, any> = {};

    for (const id of ids) {
      try {
        const prediction = await MockDataProvider.getPrediction(id);
        telemetry[id] = prediction;
      } catch (error) {
        console.warn(`Mock telemetry generation failed for fixture ${id}:`, error);
      }
    }

    return telemetry;
  }
};

// Add type definition to window
declare global {
  interface Window {
    isServerOffline?: boolean;
  }
}
