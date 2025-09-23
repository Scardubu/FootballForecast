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
 * Ensure valid session before making API calls
 */
async function ensureSession(): Promise<void> {
  try {
    const response = await fetch('/api/auth/status', {
      credentials: 'include' // Include session cookies
    });
    
    if (response.ok) {
      const status = await response.json();
      if (status.authenticated) {
        return; // Session is valid
      }
    }
    
    // Session invalid or missing - redirect to authentication
    throw new Error('Session expired or invalid. Please refresh the page.');
    
  } catch (error) {
    throw new Error('Unable to verify authentication status.');
  }
}

/**
 * Make authenticated requests to our backend API Football proxy
 */
async function apiRequest<T>(endpoint: string, options?: RequestInit): Promise<APIFootballResponse<T>> {
  // Ensure valid session before making the request
  await ensureSession();
  
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
      throw new Error('Authentication failed. Session may have expired.');
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