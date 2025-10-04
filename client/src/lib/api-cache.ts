/**
 * Simple in-memory cache for API responses
 * Reduces unnecessary API calls and improves performance
 */

import { envConfig } from './env-config';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class APICache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private enabled: boolean;

  constructor() {
    this.enabled = envConfig.cacheEnabled;
  }

  /**
   * Generate cache key from URL and options
   */
  private generateKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Get data from cache if available and valid
   */
  get<T>(url: string, options?: RequestInit): T | null {
    if (!this.enabled) return null;

    const key = this.generateKey(url, options);
    const entry = this.cache.get(key);

    if (!entry) return null;

    if (this.isValid(entry)) {
      if (envConfig.enableDebugMode) {
        console.log(`[Cache HIT] ${key}`);
      }
      return entry.data as T;
    }

    // Entry expired, remove it
    this.cache.delete(key);
    return null;
  }

  /**
   * Store data in cache
   */
  set<T>(url: string, data: T, options?: RequestInit, ttl?: number): void {
    if (!this.enabled) return;

    const key = this.generateKey(url, options);
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || envConfig.cacheTTL,
    };

    this.cache.set(key, entry);

    if (envConfig.enableDebugMode) {
      console.log(`[Cache SET] ${key} (TTL: ${entry.ttl}ms)`);
    }
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(url: string, options?: RequestInit): void {
    const key = this.generateKey(url, options);
    this.cache.delete(key);

    if (envConfig.enableDebugMode) {
      console.log(`[Cache INVALIDATE] ${key}`);
    }
  }

  /**
   * Invalidate all cache entries matching a pattern
   */
  invalidatePattern(pattern: RegExp): void {
    let count = 0;
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (pattern.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (envConfig.enableDebugMode) {
      console.log(`[Cache INVALIDATE PATTERN] ${pattern} (${count} entries)`);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();

    if (envConfig.enableDebugMode) {
      console.log('[Cache CLEAR] All entries cleared');
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      enabled: this.enabled,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl,
        valid: this.isValid(entry),
      })),
    };
  }
}

// Export singleton instance
export const apiCache = new APICache();
