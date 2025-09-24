import { useState, useEffect } from 'react';

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

interface UseApiOptions {
  retry?: boolean;
  retryDelay?: number;
  maxRetries?: number;
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
  
  const { retry = true, retryDelay = 1000, maxRetries = 3 } = options;
  
  const fetchData = async (attempt = 1): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 502 && retry && attempt <= maxRetries) {
          // Retry on 502 errors with exponential backoff
          setTimeout(() => {
            fetchData(attempt + 1);
          }, retryDelay * Math.pow(2, attempt - 1));
          return;
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setState({ data, loading: false, error: null });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setState({ data: null, loading: false, error: errorMessage });
    }
  };
  
  useEffect(() => {
    fetchData();
  }, [url]);
  
  const refetch = () => {
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
