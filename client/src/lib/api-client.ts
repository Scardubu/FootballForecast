// client/src/lib/api-client.ts

/**
 * Secure, generic client-side API wrapper that uses session authentication.
 * This eliminates the exposure of API keys in the frontend bundle and provides
 * a flexible way to interact with different backend endpoints.
 */

import type { APIFixture, APITeamData, APIPrediction, APIStanding } from "./api-football-types";
import type { Prediction } from "@shared/schema";
import { measureAsync } from "./performance";
import { apiCache } from "./api-cache";
import { envConfig } from "./env-config";

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
    // Special handling for 404 on prediction endpoints
    if (response.status === 404 && response.url.includes('/api/predictions/')) {
      console.warn(`Resource not found: ${response.url} - Using fallback data`);
      // For prediction endpoints, 404s will be handled by the server with fallbacks
      // Retry the request once - the server-side fallback should handle it
      const fixtureId = response.url.split('/').pop();
      if (fixtureId) {
        console.info(`Retrying prediction request for fixture: ${fixtureId}`);
        // We'll let the caller handle retries instead of doing it here
        throw new Error(`Prediction not found for fixture: ${fixtureId}`);
      }
    }
    
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
   * Includes intelligent caching for GET requests.
   * @param endpoint The API endpoint to call (e.g., 'fixtures/live').
   * @param options Optional RequestInit options.
   * @param cacheTTL Optional cache TTL in milliseconds (overrides default).
   * @returns The parsed JSON response.
   */
  async request<T>(endpoint: string, options?: RequestInit, cacheTTL?: number): Promise<T> {
    const url = `/api/${endpoint}`;
    const method = options?.method || 'GET';

    // Check cache for GET requests
    if (method === 'GET') {
      const cached = apiCache.get<T>(url, options);
      if (cached !== null) {
        return cached;
      }
    }

    return measureAsync(`api-${endpoint}`, async () => {
      const response = await fetch(url, {
        ...options,
        credentials: 'include', // Ensures session cookies are sent
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });
      
      const data = await handleResponse<T>(response);

      // Cache successful GET requests
      if (method === 'GET' && response.ok) {
        apiCache.set(url, data, options, cacheTTL);
      }

      return data;
    });
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
    return this.request<Prediction>(`predictions/${fixtureId}`, undefined, 600000) // 10 minute cache TTL
      .catch(error => {
        // Fallback to telemetry endpoint if a specific prediction fails
        console.warn(`Failed to get prediction for fixture ${fixtureId}: ${error.message}. Trying telemetry fallback.`);
        
        // Try to get the prediction from telemetry as a fallback
        return this.getPredictionTelemetry([fixtureId]).then(telemetry => {
          const prediction = telemetry[fixtureId];
          if (prediction) {
            console.info(`Successfully retrieved prediction for fixture ${fixtureId} from telemetry`);
            return prediction;
          }
          throw new Error(`No prediction found for fixture ${fixtureId}`);
        });
      });
  },

  /**
   * Fetches aggregated prediction telemetry for the given fixture IDs.
   * @param fixtureIds An array of fixture IDs to fetch telemetry for.
   * @returns A record mapping fixture IDs to their corresponding prediction telemetry.
   */
  getPredictionTelemetry: function(fixtureIds?: number[]) {
    const query = Array.isArray(fixtureIds) && fixtureIds.length > 0
      ? `?fixtureIds=${fixtureIds.join(",")}`
      : "";
    return this.request<Record<number, Prediction | undefined>>(`predictions/telemetry${query}`);
  },

  // --- Telemetry ---
  getIngestionSummary: function(limit?: number) {
    const query = typeof limit === 'number' && Number.isFinite(limit) ? `?limit=${Math.floor(limit)}` : '';
    return this.request<any>(`telemetry/ingestion${query}`);
  },
};