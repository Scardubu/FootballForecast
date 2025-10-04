import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { buildApiUrl, createAbortController } from "@/lib/utils";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    // Handle different error types with appropriate messages
    if (res.status === 404) {
      throw new Error(`Resource not found: ${res.url}`);
    } else if (res.status === 401) {
      throw new Error('Authentication required');
    } else if (res.status === 403) {
      throw new Error('Access denied');
    } else if (res.status === 429) {
      // Rate limit hit - throw specific error for better handling
      throw new Error('429 Too Many Requests - Rate limit exceeded. Using cached data.');
    } else if (res.status >= 500) {
      throw new Error(`Server error (${res.status}): The server encountered an error`);
    }
    
    // For other errors, try to get error details from response
    try {
      const text = await res.text();
      throw new Error(`${res.status}: ${text || res.statusText}`);
    } catch (textError) {
      // If we can't get text, just use status
      throw new Error(`${res.status}: ${res.statusText}`);
    }
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    // Create an AbortController to handle timeouts (cross-browser)
    const { signal, cancel } = createAbortController(10000);
    const finalUrl = buildApiUrl(url);
    
    const res = await fetch(finalUrl, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
      signal
    });
    
    cancel();
    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Request timeout: ${url}`);
    }
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn = <T>(options: {
  on401: UnauthorizedBehavior;
}): QueryFunction<T> =>
  async ({ queryKey }) => {
    const { on401: unauthorizedBehavior } = options;
    try {
      // Create an AbortController to handle timeouts
      const { signal, cancel } = createAbortController(8000); // 8 second timeout
      const finalUrl = buildApiUrl(queryKey.join("/") as string);
      
      const res = await fetch(finalUrl, {
        credentials: "include",
        signal
      });
      
      cancel();

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      // Handle network errors gracefully
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.warn(`Query timeout: ${queryKey.join("/")}`);
        throw new Error(`Request timeout: ${queryKey.join("/")}`);
      }
      
      // For network errors in development mode, provide helpful message
      if (error instanceof TypeError && error.message.includes('Failed to fetch') && import.meta.env.DEV) {
        console.warn(`Network error for ${queryKey.join("/")}. Is the development server running?`);
        // Return empty data for development mode to prevent UI crashes
        const path = queryKey.join("/").toLowerCase();
        if (path.includes('/fixtures') || path.includes('/teams') || path.includes('/leagues') || path.includes('/standings')) {
          return [] as T;
        }
        return {} as T;
      }
      
      throw error;
    }
  };

// Smart caching configuration based on data type
const getCacheConfig = (queryKey: string[]) => {
  const endpoint = queryKey.join('/').toLowerCase();
  
  // Live data - manual refresh only (no auto-refresh to prevent constant reloading)
  if (endpoint.includes('live') || endpoint.includes('fixtures/live')) {
    return {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: false, // DISABLED: Manual refresh only
      refetchOnWindowFocus: false, // DISABLED: Prevents reload on tab switch
    };
  }
  
  // Match predictions - cache aggressively, manual refresh only
  if (endpoint.includes('predictions')) {
    return {
      staleTime: 15 * 60 * 1000, // 15 minutes
      gcTime: 30 * 60 * 1000, // 30 minutes
      refetchInterval: false, // DISABLED: Manual refresh only
      refetchOnWindowFocus: false, // DISABLED: Prevents reload on tab switch
    };
  }
  
  // Standings - cache aggressively
  if (endpoint.includes('standings')) {
    return {
      staleTime: 60 * 60 * 1000, // 1 hour
      gcTime: 2 * 60 * 60 * 1000, // 2 hours
      refetchInterval: false, // No auto-refresh
      refetchOnWindowFocus: false,
    };
  }
  
  // Static data (leagues, teams) - cache very aggressively
  if (endpoint.includes('leagues') || endpoint.includes('teams')) {
    return {
      staleTime: 24 * 60 * 60 * 1000, // 24 hours
      gcTime: 7 * 24 * 60 * 60 * 1000, // 7 days
      refetchInterval: false,
      refetchOnWindowFocus: false,
    };
  }
  
  // Default configuration - no auto-refresh
  return {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchInterval: false, // DISABLED: Manual refresh only
    refetchOnWindowFocus: false, // DISABLED: Prevents reload on tab switch
  };
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      staleTime: 10 * 60 * 1000, // Default 10 minutes (increased from 5)
      gcTime: 30 * 60 * 1000, // Default 30 minutes
      retry: (failureCount, error: any) => {
        // NEVER retry on 429 (rate limit) - use cached data instead
        if (error?.message?.includes('429') || error?.message?.includes('Too Many Requests')) {
          console.warn('Rate limit hit - will use cached data');
          return false;
        }
        // Don't retry on other 4xx errors (client errors)
        if (error?.message?.includes('400') || 
            error?.message?.includes('401') || 
            error?.message?.includes('403') || 
            error?.message?.includes('404')) {
          return false;
        }
        // Retry only once for network/server errors to prevent retry storms
        return failureCount < 1;
      },
      retryDelay: (attemptIndex) => {
        // Fixed 3 second delay to prevent retry spam
        return 3000;
      },
      refetchOnWindowFocus: false, // DISABLED: Prevents reload when switching tabs
      refetchOnReconnect: false, // DISABLED: Prevents reload on network reconnect
      refetchIntervalInBackground: false,
      // Prevent duplicate requests in flight
      networkMode: 'online',
    },
    mutations: {
      retry: (failureCount, error: any) => {
        // Never retry mutations on any client errors or rate limits
        if (error?.message?.includes('4')) return false;
        return failureCount < 1; // Only 1 retry for mutations
      },
    },
  },
});

// Export the cache config function for use in custom hooks
export { getCacheConfig };
