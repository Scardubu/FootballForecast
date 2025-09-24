// client/src/lib/api-client.ts

/**
 * Secure, generic client-side API wrapper that uses session authentication.
 * This eliminates the exposure of API keys in the frontend bundle and provides
 * a flexible way to interact with different backend endpoints.
 */

import type { APIFixture, APITeamData, APIPrediction, APIStanding } from "./api-football-types";
import type { Prediction } from "@shared/schema";

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

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    if (response.status === 401) {
      // This error can be caught by a global error handler or React Query's `onError`
      // to trigger a redirect to the login page.
      throw new Error('Authentication required. Please log in.');
    }
    // Attempt to parse error details from the body
    const errorBody = await response.json().catch(() => null);
    const errorMessage = errorBody?.error || `API Error: ${response.status} ${response.statusText}`;
    throw new Error(errorMessage);
  }
  return response.json();
};

export const apiClient = {
  /**
   * A generic method for making authenticated requests to any backend endpoint.
   * It automatically handles session cookies and response parsing.
   * @param endpoint The API endpoint to call (e.g., 'fixtures/live').
   * @param options Optional RequestInit options.
   * @returns The parsed JSON response.
   */
  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`/api/${endpoint}`, {
      ...options,
      credentials: 'include', // Ensures session cookies are sent
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
    return handleResponse<T>(response);
  },

  /**
   * Checks the user's current authentication status.
   * @returns A promise that resolves to true if authenticated, false otherwise.
   */
  async checkSession(): Promise<boolean> {
    try {
      const status = await this.request<{ authenticated: boolean }>('auth/status');
      return status.authenticated === true;
    } catch (error) {
      console.warn('Session check failed:', error);
      return false;
    }
  },

  // --- API-Football Proxied Endpoints ---
  getLiveFixtures: function() {
    return this.request<APIFootballResponse<APIFixture[]>>('football/fixtures?live=all');
  },
  getFixtures: function(leagueId?: number, date?: string) {
    const params = new URLSearchParams();
    if (leagueId) params.append('league', leagueId.toString());
    if (date) params.append('date', date);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<APIFootballResponse<APIFixture[]>>(`football/fixtures${query}`);
  },
  getStandings: function(leagueId: number, season: number) {
    return this.request<APIFootballResponse<[{ league: { standings: APIStanding[][] } }]>>(`football/standings?league=${leagueId}&season=${season}`);
  },
  getTeams: function(leagueId?: number, season?: number) {
    const params = new URLSearchParams();
    if (leagueId) params.append('league', leagueId.toString());
    if (season) params.append('season', season.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<APIFootballResponse<APITeamData[]>>(`football/teams${query}`);
  },
  getLeagues: function(country?: string, season?: number) {
    const params = new URLSearchParams();
    if (country) params.append('country', country);
    if (season) params.append('season', season.toString());
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request<APIFootballResponse<any>>(`football/leagues${query}`); // Define league type if needed
  },
  getTeamStatistics: function(teamId: number, leagueId: number, season: number) {
    return this.request<APIFootballResponse<any>>(`football/teams/statistics?team=${teamId}&league=${leagueId}&season=${season}`); // Define stats type if needed
  },

  // --- Internal & ML Endpoints ---
  /**
   * Fetches predictions from the internal ML model for a given fixture.
   * @param fixtureId The ID of the fixture to get predictions for.
   * @returns The prediction data.
   */
  getPredictions: function(fixtureId: number) {
    // This endpoint returns a custom prediction object, not the direct API-Football prediction response
    return this.request<Prediction>(`predictions/${fixtureId}`);
  },
};