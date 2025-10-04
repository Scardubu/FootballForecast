import { useState, useEffect, useRef } from 'react';
import { isTestEnv } from '@/lib/env';
import { getCacheConfig } from '@/lib/queryClient';
import { MockDataProvider } from '@/lib/mock-data-provider';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  retry?: boolean;
  retryDelay?: number;
  maxRetries?: number;
  enableCache?: boolean;
  refreshInterval?: number;
  disabled?: boolean;
}

export function useApi<T>(
  url: string, 
  options: UseApiOptions = {}
): ApiState<T> & { refetch: () => void } {
  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });
  
  const { 
    retry = true, 
    retryDelay = 1000, 
    maxRetries = 3,
    enableCache = true,
    refreshInterval,
    disabled = false,
  } = options;
  
  const cacheRef = useRef<{ data: T | null; timestamp: number; staleTime: number } | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Helper function to get mock data based on URL pattern
  const getMockDataForUrl = async (path: string): Promise<any> => {
    if (path.includes('/api/teams') || path.includes('/api/football/teams')) {
      return await MockDataProvider.getTeams();
    } else if (path.includes('/api/leagues')) {
      return await MockDataProvider.getLeagues();
    } else if (path.includes('/api/fixtures/live')) {
      return await MockDataProvider.getLiveFixtures();
    } else if (path.includes('/api/football/fixtures')) {
      const fixtures = await MockDataProvider.getAllFixtures();
      const teams = await MockDataProvider.getTeams();
      const teamMap = new Map();
      teams.forEach(team => teamMap.set(team.id, team));
      
      return { 
        response: fixtures.map(f => ({
          fixture: {
            id: f.id,
            date: f.date,
            status: { short: f.status },
            venue: { name: f.venue || 'Local Stadium' },
          },
          teams: {
            home: { id: f.homeTeamId, name: teamMap.get(f.homeTeamId)?.name || 'Home Team' },
            away: { id: f.awayTeamId, name: teamMap.get(f.awayTeamId)?.name || 'Away Team' }
          },
          goals: { home: f.homeScore, away: f.awayScore },
          league: { id: f.leagueId, round: f.round || 'Regular Season' }
        }))
      };
    } else if (path.includes('/api/standings')) {
      return await MockDataProvider.getStandings();
    } else if (path.includes('/api/stats')) {
      return await MockDataProvider.getStats();
    } else if (path.includes('/api/predictions/telemetry')) {
      const fixtureIdsMatch = path.match(/fixtureids=([\d,]+)/);
      const fixtureIds = fixtureIdsMatch ? fixtureIdsMatch[1].split(',').map(id => parseInt(id, 10)).filter(id => !Number.isNaN(id)) : undefined;
      return await MockDataProvider.getPredictionTelemetry(fixtureIds);
    } else if (path.includes('/api/predictions/')) {
      const fixtureIdMatch = path.match(/\/api\/predictions\/(\d+)/);
      if (fixtureIdMatch) {
        const fixtureId = parseInt(fixtureIdMatch[1]);
        return await MockDataProvider.getPrediction(fixtureId);
      }
      return {};
    } else {
      return path.includes('leagues') || path.includes('fixtures') || 
             path.includes('teams') || path.includes('standings') ? [] : {};
    }
  };
  
  const fetchData = async (attempt = 1, skipCache = false): Promise<void> => {
    // Prevent retry storms - if already in offline mode and multiple retries failed, use mock data
    if (attempt > 2 && MockDataProvider.isOfflineMode()) {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const mockData = await getMockDataForUrl(url.toLowerCase());
      setState({ data: mockData as T, loading: false, error: null });
      return;
    }
    
    try {
      // Get lowercase URL for consistent path matching
      const path = url.toLowerCase();
      
      if (MockDataProvider.isOfflineMode()) {
        setState(prev => ({ ...prev, loading: true, error: null }));
        
        // Determine which mock data to return based on the URL
        let mockData: any = null;
        if (path.includes('/api/teams') || path.includes('/api/football/teams')) {
          mockData = await MockDataProvider.getTeams();
        } else if (path.includes('/api/leagues')) {
          mockData = await MockDataProvider.getLeagues();
        } else if (path.includes('/api/fixtures/live')) {
          mockData = await MockDataProvider.getLiveFixtures();
        } else if (path.includes('/api/football/fixtures')) {
          // Format mock data to match API-Football structure
          const fixtures = await MockDataProvider.getAllFixtures();
          const teams = await MockDataProvider.getTeams();
          
          // Create a map for quick team lookups
          const teamMap = new Map();
          teams.forEach(team => teamMap.set(team.id, team));
          
          mockData = { 
            response: fixtures.map(f => {
              // Get actual team names from mock data
              const homeTeam = teamMap.get(f.homeTeamId) || { name: 'Home Team' };
              const awayTeam = teamMap.get(f.awayTeamId) || { name: 'Away Team' };
              
              return {
                fixture: {
                  id: f.id,
                  date: f.date,
                  status: { short: f.status },
                  venue: { name: f.venue || 'Local Stadium' },
                },
                teams: {
                  home: { id: f.homeTeamId, name: homeTeam.name },
                  away: { id: f.awayTeamId, name: awayTeam.name }
                },
                goals: {
                  home: f.homeScore,
                  away: f.awayScore
                },
                league: {
                  id: f.leagueId,
                  round: f.round || 'Regular Season'
                }
              };
            })
          };
        } else if (path.includes('/api/standings')) {
          mockData = await MockDataProvider.getStandings();
        } else if (path.includes('/api/stats')) {
          mockData = await MockDataProvider.getStats();
        } else if (path.includes('/api/predictions/telemetry')) {
          const fixtureIdsMatch = path.match(/fixtureids=([\d,]+)/);
          const fixtureIds = fixtureIdsMatch ? fixtureIdsMatch[1].split(',').map(id => parseInt(id, 10)).filter(id => !Number.isNaN(id)) : undefined;
          mockData = await MockDataProvider.getPredictionTelemetry(fixtureIds);
        } else if (path.includes('/api/predictions/')) {
          // Extract fixture ID from URL like /api/predictions/1001
          const fixtureIdMatch = path.match(/\/api\/predictions\/(\d+)/);
          if (fixtureIdMatch) {
            const fixtureId = parseInt(fixtureIdMatch[1]);
            mockData = await MockDataProvider.getPrediction(fixtureId);
          } else {
            mockData = {};
          }
        } else {
          // Default empty data for unknown endpoints
          mockData = path.includes('leagues') || path.includes('fixtures') || 
                    path.includes('teams') || path.includes('standings') ? [] : {};
        }
        
        setState({ data: mockData as T, loading: false, error: null });
        return;
      }
      
      // Normal online mode continues below
      // Check cache first if enabled
      if (enableCache && !skipCache && cacheRef.current) {
        const { data, timestamp, staleTime } = cacheRef.current;
        const now = Date.now();
        
        if (now - timestamp < staleTime && data !== null) {
          setState({ data, loading: false, error: null });
          return;
        }
      }
      
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        const inTest = isTestEnv();
        const controller = inTest ? null : new AbortController();
        // Reduced timeout to 8 seconds with better error handling
        const timeoutId = inTest ? null : setTimeout(() => controller!.abort(), 8000);
        
        const response = inTest
          ? await fetch(url)
          : await fetch(url, { signal: controller!.signal });
        if (timeoutId) clearTimeout(timeoutId as unknown as number);
        
        if (!response.ok) {
          // Handle rate limiting (429) - use cached data, don't retry
          if (response.status === 429) {
            if (cacheRef.current?.data) {
              console.info(`Rate limit hit for ${url}, using cached data`);
              setState({ data: cacheRef.current.data, loading: false, error: null });
              return;
            }
            // If no cache, use safe defaults
            let safe: any = {};
            const path = url.toLowerCase();
            if (path.includes('/fixtures') || path.includes('/teams') || path.includes('/leagues') || path.includes('/standings')) {
              safe = [];
            }
            console.warn(`Rate limit hit for ${url}, no cached data available`);
            setState({ data: safe as T, loading: false, error: null });
            return;
          }
          
          if (response.status === 502 && retry && attempt <= maxRetries) {
            // Retry on 502 errors with exponential backoff
            setTimeout(() => {
              fetchData(attempt + 1);
            }, retryDelay * Math.pow(2, attempt - 1));
            return;
          }

          // Gracefully handle degraded serverless mode (503) by returning safe defaults
          if (response.status === 503) {
            let safe: any = {};
            const path = url.toLowerCase();
            if (path.includes('/fixtures') || path.includes('/teams') || path.includes('/leagues') || path.includes('/standings')) {
              safe = [];
            }
            setState({ data: safe as T, loading: false, error: null });
            return;
          }

          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Cache the result if caching is enabled
        if (enableCache) {
          const cacheConfig = getCacheConfig(url.split('/'));
          cacheRef.current = {
            data,
            timestamp: Date.now(),
            staleTime: cacheConfig.staleTime
          };
        }
        
        setState({ data, loading: false, error: null });
      } catch (error: any) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          // Only switch to offline mode after multiple attempts to prevent flapping
          if (attempt >= 2) {
            // Debounced offline mode switching
            if (attempt === 2) {
              console.warn(`API request to ${url} timed out after multiple attempts, using offline mode`);
              localStorage.setItem('serverStatus', 'offline');
              window.isServerOffline = true;
              window.dispatchEvent(new Event('serverStatusChange'));
            }
            // Use mock data instead of retrying indefinitely
            const mockData = await getMockDataForUrl(path);
            setState({ data: mockData as T, loading: false, error: null });
            return;
          }
          // First attempt failed - retry once more before giving up
          if (retry && attempt < 2) {
            setTimeout(() => {
              fetchData(attempt + 1);
            }, 1500); // Fixed 1.5s delay instead of exponential
          }
          return;
        }

        if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))) {
          // Network error - switch to offline mode immediately
          if (attempt === 1) {
            console.warn(`Network error for ${url}, using offline mode`);
            localStorage.setItem('serverStatus', 'offline');
            window.isServerOffline = true;
            window.dispatchEvent(new Event('serverStatusChange'));
          }
          const mockData = await getMockDataForUrl(path);
          setState({ data: mockData as T, loading: false, error: null });
          return;
        }

        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState({ data: null, loading: false, error: errorMessage });
    }
  };
  useEffect(() => {
    if (disabled) {
      // Skip fetching entirely
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    fetchData();
    
    // DISABLED: Auto-refresh intervals to prevent constant reloading
    // Refresh should be triggered manually or by user interaction
    // const cacheConfig = getCacheConfig(url.split('/'));
    // const interval = refreshInterval || cacheConfig.refetchInterval;
    
    // Listen for server status changes
    const handleServerStatusChange = () => {
      // Only refetch if going back online
      if (!MockDataProvider.isOfflineMode()) {
        fetchData(1, true); // Refetch with new server status
      }
    };
    
    if (!disabled) {
      window.addEventListener('serverStatusChange', handleServerStatusChange);
    }
    
    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (!disabled) {
        window.removeEventListener('serverStatusChange', handleServerStatusChange);
      }
    };
  }, [url, disabled]);
  
  const refetch = () => {
    if (disabled) return;
    fetchData();
  };
  
  return { ...state, refetch };
}

// Specialized hook for API endpoints that depend on the selected league
export function useLeagueApi<T>(
  endpoint: string, 
  leagueId?: string,
  options: UseApiOptions = {}
): ApiState<T> & { refetch: () => void } {
  const url = leagueId ? `${endpoint}?league=${leagueId}` : endpoint;
  return useApi<T>(url, options);
}
