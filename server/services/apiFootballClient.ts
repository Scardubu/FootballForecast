/**
 * Resilient API-Football client with retry logic, caching, and circuit breaker
 */

import { api } from '../config/index.js';
import { logger } from '../middleware/logger.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  halfOpenTrials: number;
}

interface ApiFootballResponse<T> {
  get: string;
  parameters: Record<string, string>;
  errors: Record<string, string> | string[] | [];
  results: number;
  paging: {
    current: number;
    total: number;
  };
  response: T;
}

export class ApiFootballClient {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://v3.football.api-sports.io';
  private readonly cache = new Map<string, CacheEntry<any>>();
  private readonly circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'CLOSED',
    halfOpenTrials: 0
  };
  
  // Circuit breaker configuration
  private readonly maxFailures = 5;
  private readonly openTimeoutMs = 60000; // 1 minute
  private readonly halfOpenMaxCalls = 3;
  
  // Retry configuration
  private readonly maxRetries = 3;
  private readonly baseDelayMs = 1000;
  private readonly maxDelayMs = 30000;
  
  // Cache TTL configuration (in milliseconds)
  private readonly cacheTtls = {
    'fixtures?live=all': 30000, // 30 seconds for live fixtures
    'standings': 3600000, // 1 hour for standings
    'fixtures': 1800000, // 30 minutes for fixtures
    'predictions': 1800000, // 30 minutes for predictions
    'teams': 86400000 // 24 hours for team data
  };

  constructor(apiKey?: string) {
    // Use centralized config with secure validation
    this.apiKey = apiKey || api.footballApiKey;
    
    // Configuration validation is handled by centralized config
    logger.info('API-Football client initialized with secure configuration');
    
    // Clean up expired cache entries every 5 minutes
    setInterval(() => this.cleanupCache(), 300000);
  }

  /**
   * Make a resilient API request with caching, retries, and circuit breaker
   */
  async request<T>(endpoint: string): Promise<ApiFootballResponse<T>> {
    const cacheKey = this.getCacheKey(endpoint);
    
    // Check circuit breaker state
    if (!this.canMakeRequest()) {
      logger.warn({ endpoint: endpoint }, 'Circuit breaker OPEN, using cached data');
      return this.getCachedDataOrFallback<T>(cacheKey, endpoint);
    }
    
    // Try cache first
    const cachedData = this.getCachedData<T>(cacheKey);
    if (cachedData) {
      logger.info({ endpoint: endpoint }, 'Cache hit');
      return cachedData;
    }
    
    // Make request with retry logic
    return this.makeRequestWithRetry<T>(endpoint, cacheKey);
  }

  private async makeRequestWithRetry<T>(endpoint: string, cacheKey: string, attempt = 1): Promise<ApiFootballResponse<T>> {
    try {
      logger.info({ endpoint: endpoint, attempt: attempt }, 'API request attempt');
      
      const response = await fetch(`${this.baseUrl}/${endpoint}`, {
        headers: {
          'X-RapidAPI-Key': this.apiKey,
          'X-RapidAPI-Host': 'v3.football.api-sports.io'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limited - return cached data immediately, don't retry
          logger.warn({ endpoint: endpoint }, 'HTTP 429 Rate limit - using cached/fallback data');
          return this.getCachedDataOrFallback<T>(cacheKey, endpoint);
        }
        
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ApiFootballResponse<T> = await response.json();
      
      // Check for API-specific errors (both object and array formats)
      if (data.errors && (Object.keys(data.errors).length > 0 || (Array.isArray(data.errors) && data.errors.length > 0))) {
        // Handle object format: { errors: { requests: "msg", plan: "msg" } }
        if (typeof data.errors === 'object' && !Array.isArray(data.errors)) {
          if (data.errors.requests) {
            logger.warn({ endpoint: endpoint, error: data.errors.requests }, 'API-Football request limit reached');
            // Mark as non-retryable by recording failure without retry
            this.recordFailure();
            throw new Error(`API_LIMIT_REACHED: ${data.errors.requests}`);
          }
          if (data.errors.plan) {
            logger.warn({ endpoint: endpoint, error: data.errors.plan }, 'API-Football plan limitation');
            throw new Error(`API_PLAN_LIMIT: ${data.errors.plan}`);
          }
          if (data.errors.rateLimit) {
            logger.warn({ endpoint: endpoint, error: data.errors.rateLimit }, 'API-Football rate limit');
            throw new Error(`API_RATE_LIMIT: ${data.errors.rateLimit}`);
          }
        }
        // Handle array format: { errors: ["error_message"] }
        else if (Array.isArray(data.errors) && data.errors.length > 0) {
          // Safely handle array errors with explicit type checking
          const errorMessage = data.errors[0];
          
          // Use type assertion after checking to satisfy TypeScript
          if (typeof errorMessage === 'string') {
            const stringError = errorMessage as string;
            if (stringError.includes('requests') || stringError.includes('limit')) {
              throw new Error(`API_LIMIT_REACHED: ${stringError}`);
            }
            throw new Error(`API_ERROR: ${stringError}`);
          }
        }
      }

      // Check for empty response
      // Note: Empty responses are expected for free API plans querying current/future data
      // Don't treat this as a failure - just return the empty response
      if (!data.response || (Array.isArray(data.response) && data.response.length === 0)) {
        logger.info({ endpoint: endpoint }, 'API returned empty response (expected for free plans with current/future data)');
        // Don't throw error - return empty response and let caller handle it
        // This prevents circuit breaker from triggering on expected empty responses
        this.recordSuccess(); // Reset circuit breaker since API call was successful
        this.cacheData(cacheKey, data, endpoint);
        return data;
      }

      // Success - reset circuit breaker and cache result
      this.recordSuccess();
      this.cacheData(cacheKey, data, endpoint);
      
      return data;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ endpoint: endpoint, attempt: attempt, error: errorMessage }, 'API request failed');
      
      // For rate limit errors, immediately return cached/fallback data without retry
      if (errorMessage.includes('API_LIMIT_REACHED') || errorMessage.includes('API_RATE_LIMIT')) {
        logger.warn({ endpoint: endpoint }, 'Rate limit reached, using cached/fallback data immediately');
        return this.getCachedDataOrFallback<T>(cacheKey, endpoint);
      }
      
      // Record failure for circuit breaker (only for non-rate-limit errors)
      this.recordFailure();
      
      // Retry logic for transient errors only
      if (attempt <= this.maxRetries && this.shouldRetry(errorMessage)) {
        const delayMs = this.calculateBackoffDelay(attempt);
        logger.info({ endpoint: endpoint, delayMs: delayMs, attempt: attempt }, 'Retrying');
        await this.sleep(delayMs);
        return this.makeRequestWithRetry<T>(endpoint, cacheKey, attempt + 1);
      }
      
      // Final attempt failed - try fallback
      logger.error({ endpoint: endpoint }, 'All retries failed, attempting fallback');
      return this.getCachedDataOrFallback<T>(cacheKey, endpoint);
    }
  }

  private canMakeRequest(): boolean {
    const now = Date.now();
    
    switch (this.circuitBreaker.state) {
      case 'CLOSED':
        return true;
      case 'OPEN':
        if (now - this.circuitBreaker.lastFailureTime > this.openTimeoutMs) {
          logger.info('Circuit breaker transitioning to HALF_OPEN');
          this.circuitBreaker.state = 'HALF_OPEN';
          this.circuitBreaker.halfOpenTrials = 0;
          return true;
        }
        return false;
      case 'HALF_OPEN':
        return this.circuitBreaker.halfOpenTrials < this.halfOpenMaxCalls;
      default:
        return false;
    }
  }

  private recordSuccess(): void {
    if (this.circuitBreaker.state !== 'CLOSED') {
      logger.info('Circuit breaker reset to CLOSED after successful request');
    }
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.halfOpenTrials = 0;
    this.circuitBreaker.state = 'CLOSED';
  }

  private recordFailure(): void {
    if (this.circuitBreaker.state === 'HALF_OPEN') {
      logger.error('Circuit breaker OPEN after failure in HALF_OPEN state');
      this.circuitBreaker.state = 'OPEN';
      this.circuitBreaker.lastFailureTime = Date.now();
    } else {
      this.circuitBreaker.failures++;
      this.circuitBreaker.halfOpenTrials++;
      this.circuitBreaker.lastFailureTime = Date.now();
      
      if (this.circuitBreaker.failures >= this.maxFailures && this.circuitBreaker.state === 'CLOSED') {
        logger.error({ failures: this.circuitBreaker.failures }, 'Circuit breaker OPEN after failures');
        this.circuitBreaker.state = 'OPEN';
      }
    }
  }

  private shouldRetry(errorMessage: string): boolean {
    // Don't retry on rate limits, plan limits, or permanent errors
    return !errorMessage.includes('API_LIMIT_REACHED') &&
           !errorMessage.includes('API_PLAN_LIMIT') && 
           !errorMessage.includes('API_RATE_LIMIT') &&
           !errorMessage.includes('401') && 
           !errorMessage.includes('403');
  }

  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.baseDelayMs * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
    return Math.min(exponentialDelay + jitter, this.maxDelayMs);
  }

  private getCacheKey(endpoint: string): string {
    return `api_football_${endpoint.replace(/[^\w]/g, '_')}`;
  }

  private getCachedData<T>(cacheKey: string): ApiFootballResponse<T> | null {
    const entry = this.cache.get(cacheKey);
    if (entry && Date.now() - entry.timestamp < entry.ttl) {
      return entry.data;
    }
    return null;
  }

  private cacheData<T>(cacheKey: string, data: ApiFootballResponse<T>, endpoint: string): void {
    const ttl = this.getTtlForEndpoint(endpoint);
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private getTtlForEndpoint(endpoint: string): number {
    for (const [pattern, ttl] of Object.entries(this.cacheTtls)) {
      if (endpoint.includes(pattern)) {
        return ttl;
      }
    }
    return 300000; // Default 5 minutes
  }

  private async getCachedDataOrFallback<T>(cacheKey: string, endpoint: string): Promise<ApiFootballResponse<T>> {
    // Try stale cache first
    const staleEntry = this.cache.get(cacheKey);
    if (staleEntry) {
      logger.info({ endpoint: endpoint }, 'Using stale cache');
      return staleEntry.data;
    }
    
    // In production, do not generate fallback data - return empty response
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      logger.warn({ endpoint: endpoint }, 'Production mode: returning empty response instead of fallback');
      return {
        get: endpoint,
        parameters: {},
        errors: [],
        results: 0,
        paging: { current: 1, total: 1 },
        response: [] as unknown as T
      };
    }
    
    // Generate enhanced fallback response based on endpoint (dev/test only)
    logger.warn({ endpoint: endpoint }, 'Development mode: generating enhanced fallback response');
    
    // Import enhanced fallback data dynamically
    let fallbackResponse: any[] = [];
    
    try {
      const { enhancedFallbackData } = await import('../lib/enhanced-fallback-data.js');
      
      if (endpoint.includes('fixtures?live=all')) {
        fallbackResponse = enhancedFallbackData.generateLiveFixtures(5);
      } else if (endpoint.includes('fixtures') && !endpoint.includes('live')) {
        fallbackResponse = enhancedFallbackData.generateUpcomingFixtures(10);
      } else if (endpoint.includes('standings')) {
        const leagueIdMatch = endpoint.match(/league=(\d+)/);
        const leagueId = leagueIdMatch ? parseInt(leagueIdMatch[1]) : 39;
        fallbackResponse = [{ league: { id: leagueId, name: 'League', standings: [enhancedFallbackData.generateStandings(leagueId)] } }];
      } else if (endpoint.includes('teams/statistics')) {
        const teamIdMatch = endpoint.match(/team=(\d+)/);
        const teamId = teamIdMatch ? parseInt(teamIdMatch[1]) : 33;
        fallbackResponse = [enhancedFallbackData.generateTeamStats(teamId)];
      }
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to generate enhanced fallback');
    }
    
    return {
      get: endpoint,
      parameters: {},
      errors: [],
      results: fallbackResponse.length,
      paging: { current: 1, total: 1 },
      response: fallbackResponse as unknown as T
    };
  }

  private cleanupCache(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      logger.info({ cleanedCount: cleanedCount }, 'Cleaned up expired cache entries');
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get client status for monitoring
   */
  getStatus() {
    return {
      circuitBreaker: {
        state: this.circuitBreaker.state,
        failures: this.circuitBreaker.failures,
        lastFailureTime: this.circuitBreaker.lastFailureTime
      },
      cache: {
        size: this.cache.size,
        entries: Array.from(this.cache.keys())
      },
      config: {
        maxFailures: this.maxFailures,
        openTimeoutMs: this.openTimeoutMs,
        maxRetries: this.maxRetries
      }
    };
  }
}

// Export singleton instance
export const apiFootballClient = new ApiFootballClient();