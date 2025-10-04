/**
 * System Monitoring and Health Tracking
 * Provides real-time system health metrics and alerts
 */

import { logger } from '../middleware/logger.js';
import os from 'os';

interface HealthMetric {
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  threshold: { warning: number; critical: number };
}

interface SystemHealth {
  timestamp: string;
  overall: 'healthy' | 'degraded' | 'critical';
  metrics: HealthMetric[];
  alerts: string[];
  uptime: number;
}

export class SystemMonitor {
  private static instance: SystemMonitor;
  private startTime: number;
  private requestCount: number = 0;
  private errorCount: number = 0;
  private apiCallCount: number = 0;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;

  private constructor() {
    this.startTime = Date.now();
  }

  static getInstance(): SystemMonitor {
    if (!SystemMonitor.instance) {
      SystemMonitor.instance = new SystemMonitor();
    }
    return SystemMonitor.instance;
  }

  /**
   * Record a request
   */
  recordRequest(): void {
    this.requestCount++;
  }

  /**
   * Record an error
   */
  recordError(): void {
    this.errorCount++;
  }

  /**
   * Record an API call
   */
  recordApiCall(): void {
    this.apiCallCount++;
  }

  /**
   * Record a cache hit
   */
  recordCacheHit(): void {
    this.cacheHits++;
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(): void {
    this.cacheMisses++;
  }

  /**
   * Get current system health
   */
  getSystemHealth(): SystemHealth {
    const metrics: HealthMetric[] = [];
    const alerts: string[] = [];

    // Memory metrics
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const heapPercent = Math.round((heapUsedMB / heapTotalMB) * 100);

    metrics.push({
      name: 'Memory Usage (Heap)',
      value: heapPercent,
      unit: '%',
      status: heapPercent > 90 ? 'critical' : heapPercent > 75 ? 'warning' : 'healthy',
      threshold: { warning: 75, critical: 90 }
    });

    if (heapPercent > 90) {
      alerts.push('Critical: Heap memory usage above 90%');
    } else if (heapPercent > 75) {
      alerts.push('Warning: Heap memory usage above 75%');
    }

    // System memory
    const totalMemMB = Math.round(os.totalmem() / 1024 / 1024);
    const freeMemMB = Math.round(os.freemem() / 1024 / 1024);
    const usedMemMB = totalMemMB - freeMemMB;
    const systemMemPercent = Math.round((usedMemMB / totalMemMB) * 100);

    metrics.push({
      name: 'System Memory',
      value: systemMemPercent,
      unit: '%',
      status: systemMemPercent > 95 ? 'critical' : systemMemPercent > 85 ? 'warning' : 'healthy',
      threshold: { warning: 85, critical: 95 }
    });

    if (systemMemPercent > 95) {
      alerts.push('Critical: System memory usage above 95%');
    }

    // CPU load average (1 minute)
    const loadAvg = os.loadavg();
    const cpuCount = os.cpus().length;
    const loadPercent = Math.round((loadAvg[0] / cpuCount) * 100);

    metrics.push({
      name: 'CPU Load (1min avg)',
      value: loadPercent,
      unit: '%',
      status: loadPercent > 90 ? 'critical' : loadPercent > 70 ? 'warning' : 'healthy',
      threshold: { warning: 70, critical: 90 }
    });

    if (loadPercent > 90) {
      alerts.push('Critical: CPU load above 90%');
    }

    // Error rate
    const errorRate = this.requestCount > 0 
      ? Math.round((this.errorCount / this.requestCount) * 100) 
      : 0;

    metrics.push({
      name: 'Error Rate',
      value: errorRate,
      unit: '%',
      status: errorRate > 10 ? 'critical' : errorRate > 5 ? 'warning' : 'healthy',
      threshold: { warning: 5, critical: 10 }
    });

    if (errorRate > 10) {
      alerts.push('Critical: Error rate above 10%');
    } else if (errorRate > 5) {
      alerts.push('Warning: Error rate above 5%');
    }

    // Cache hit rate
    const totalCacheRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalCacheRequests > 0
      ? Math.round((this.cacheHits / totalCacheRequests) * 100)
      : 0;

    metrics.push({
      name: 'Cache Hit Rate',
      value: cacheHitRate,
      unit: '%',
      status: cacheHitRate < 50 ? 'warning' : cacheHitRate < 30 ? 'critical' : 'healthy',
      threshold: { warning: 50, critical: 30 }
    });

    if (cacheHitRate < 30 && totalCacheRequests > 10) {
      alerts.push('Warning: Cache hit rate below 30%');
    }

    // Determine overall health
    const criticalCount = metrics.filter(m => m.status === 'critical').length;
    const warningCount = metrics.filter(m => m.status === 'warning').length;
    
    let overall: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (criticalCount > 0) {
      overall = 'critical';
    } else if (warningCount > 0) {
      overall = 'degraded';
    }

    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      timestamp: new Date().toISOString(),
      overall,
      metrics,
      alerts,
      uptime
    };
  }

  /**
   * Get statistics summary
   */
  getStats() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const totalCacheRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalCacheRequests > 0
      ? Math.round((this.cacheHits / totalCacheRequests) * 100)
      : 0;
    const errorRate = this.requestCount > 0
      ? ((this.errorCount / this.requestCount) * 100).toFixed(2)
      : '0.00';

    return {
      uptime,
      requests: {
        total: this.requestCount,
        errors: this.errorCount,
        errorRate: `${errorRate}%`
      },
      api: {
        calls: this.apiCallCount,
        avgPerMinute: uptime > 0 ? (this.apiCallCount / (uptime / 60)).toFixed(2) : '0.00'
      },
      cache: {
        hits: this.cacheHits,
        misses: this.cacheMisses,
        hitRate: `${cacheHitRate}%`
      },
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
      }
    };
  }

  /**
   * Reset statistics (useful for testing)
   */
  resetStats(): void {
    this.requestCount = 0;
    this.errorCount = 0;
    this.apiCallCount = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    logger.info('System monitor statistics reset');
  }

  /**
   * Log current health status
   */
  logHealthStatus(): void {
    const health = this.getSystemHealth();
    const stats = this.getStats();

    logger.info({
      health: health.overall,
      uptime: health.uptime,
      alerts: health.alerts.length,
      stats
    }, 'System health check');

    if (health.alerts.length > 0) {
      health.alerts.forEach(alert => {
        if (alert.startsWith('Critical')) {
          logger.error({ alert }, 'System health alert');
        } else {
          logger.warn({ alert }, 'System health warning');
        }
      });
    }
  }
}

// Export singleton instance
export const systemMonitor = SystemMonitor.getInstance();
