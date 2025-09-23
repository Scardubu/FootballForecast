/**
 * Secure client-side API wrapper that uses session authentication
 * Eliminates exposure of API keys in frontend bundle
 */

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

/**
 * Simple session check - returns true if authenticated, false if not
 */
async function checkSession(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/status', {
      credentials: 'include' // Include session cookies
    });
    
    if (response.ok) {
      const status = await response.json();
      return status.authenticated === true;
    }
    
    return false;
  } catch (error) {
    console.warn('Session check failed:', error);
    return false;
  }
}

/**
 * Make authenticated requests to our backend API Football proxy
 * Now works with the AuthProvider system - relies on session cookies
 */
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<APIFootballResponse<T>> {
  const response = await fetch(`/api/football/${endpoint}`, {
    ...options,
    credentials: 'include', // Include session cookies
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required. The AuthProvider should handle this automatically.');
    }
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

export async function getLiveFixtures() {
  return apiRequest('fixtures/live');
}

export async function getFixtures(leagueId?: number, date?: string) {
  const params = new URLSearchParams();
  if (leagueId) params.append('league', leagueId.toString());
  if (date) params.append('date', date);
  
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`fixtures${query}`);
}

export async function getStandings(leagueId: number, season: number) {
  return apiRequest(`standings/${leagueId}/${season}`);
}

export async function getTeams(leagueId?: number, season?: number) {
  const params = new URLSearchParams();
  if (leagueId) params.append('league', leagueId.toString());
  if (season) params.append('season', season.toString());
  
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`teams${query}`);
}

export async function getPredictions(fixtureId: number) {
  return apiRequest(`predictions/${fixtureId}`);
}

export async function getLeagues(country?: string, season?: number) {
  const params = new URLSearchParams();
  if (country) params.append('country', country);
  if (season) params.append('season', season.toString());
  
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`leagues${query}`);
}

export async function getTeamStatistics(teamId: number, leagueId: number, season: number) {
  return apiRequest(`teams/${teamId}/statistics?league=${leagueId}&season=${season}`);
}