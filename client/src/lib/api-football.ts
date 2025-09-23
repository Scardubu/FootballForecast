// Secure API key validation - fail fast if not properly configured
const API_FOOTBALL_KEY = (() => {
  const key = import.meta.env.VITE_API_FOOTBALL_KEY;
  if (!key || key === "your-api-key" || key.length < 10) {
    throw new Error(
      '🔴 VITE_API_FOOTBALL_KEY is not properly configured. ' +
      'Please set a valid API key in your environment variables or Replit Secrets.'
    );
  }
  return key;
})();
const API_FOOTBALL_HOST = "v3.football.api-sports.io";

export interface APIFootballResponse<T> {
  get: string;
  parameters: Record<string, any>;
  errors: any[];
  results: number;
  paging: {
    current: number;
    total: number;
  };
  response: T;
}

export async function fetchFromAPIFootball<T>(endpoint: string): Promise<APIFootballResponse<T>> {
  const response = await fetch(`https://${API_FOOTBALL_HOST}/${endpoint}`, {
    headers: {
      'X-RapidAPI-Key': API_FOOTBALL_KEY,
      'X-RapidAPI-Host': API_FOOTBALL_HOST
    }
  });
  
  if (!response.ok) {
    throw new Error(`API-Football error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

export async function getLiveFixtures() {
  return fetchFromAPIFootball('fixtures?live=all');
}

export async function getFixtures(leagueId?: number, date?: string) {
  const params = new URLSearchParams();
  if (leagueId) params.append('league', leagueId.toString());
  if (date) params.append('date', date);
  
  return fetchFromAPIFootball(`fixtures?${params.toString()}`);
}

export async function getStandings(leagueId: number, season: number) {
  return fetchFromAPIFootball(`standings?league=${leagueId}&season=${season}`);
}

export async function getTeams(leagueId?: number, season?: number) {
  const params = new URLSearchParams();
  if (leagueId) params.append('league', leagueId.toString());
  if (season) params.append('season', season.toString());
  
  return fetchFromAPIFootball(`teams?${params.toString()}`);
}

export async function getPredictions(fixtureId: number) {
  return fetchFromAPIFootball(`predictions?fixture=${fixtureId}`);
}

export async function getLeagues(country?: string, season?: number) {
  const params = new URLSearchParams();
  if (country) params.append('country', country);
  if (season) params.append('season', season.toString());
  
  return fetchFromAPIFootball(`leagues?${params.toString()}`);
}

export async function getTeamStatistics(teamId: number, leagueId: number, season: number) {
  return fetchFromAPIFootball(`teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`);
}
