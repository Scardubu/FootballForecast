/**
 * Performance monitoring and optimization utilities
 */

import { performance } from 'perf_hooks';
import logger from './logger.js';

// Store performance metrics
const metrics: Record<string, {
  count: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
  avgTime: number;
  lastMeasured: number;
}> = {};

/**
 * Measure execution time of a function
 */
export function measurePerformance<T>(
  name: string, 
  fn: () => T,
  logThreshold?: number
): T {
  const start = performance.now();
  try {
    return fn();
  } finally {
    const end = performance.now();
    const duration = end - start;
    
    // Record metrics
    if (!metrics[name]) {
      metrics[name] = {
        count: 0,
        totalTime: 0,
        minTime: duration,
        maxTime: duration,
        avgTime: duration,
        lastMeasured: Date.now()
      };
    }
    
    const metric = metrics[name];
    metric.count++;
    metric.totalTime += duration;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
    metric.avgTime = metric.totalTime / metric.count;
    metric.lastMeasured = Date.now();
    
    // Log if exceeds threshold
    if (logThreshold && duration > logThreshold) {
      logger.warn({
        operation: name,
        duration,
        threshold: logThreshold,
        avgTime: metric.avgTime
      }, `Performance warning: ${name} took ${duration.toFixed(2)}ms (threshold: ${logThreshold}ms)`);
    }
  }
}

/**
 * Async version of measurePerformance
 */
export async function measurePerformanceAsync<T>(
  name: string, 
  fn: () => Promise<T>,
  logThreshold?: number
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const end = performance.now();
    const duration = end - start;
    
    // Record metrics
    if (!metrics[name]) {
      metrics[name] = {
        count: 0,
        totalTime: 0,
        minTime: duration,
        maxTime: duration,
        avgTime: duration,
        lastMeasured: Date.now()
      };
    }
    
    const metric = metrics[name];
    metric.count++;
    metric.totalTime += duration;
    metric.minTime = Math.min(metric.minTime, duration);
    metric.maxTime = Math.max(metric.maxTime, duration);
    metric.avgTime = metric.totalTime / metric.count;
    metric.lastMeasured = Date.now();
    
    // Log if exceeds threshold
    if (logThreshold && duration > logThreshold) {
      logger.warn({
        operation: name,
        duration,
        threshold: logThreshold,
        avgTime: metric.avgTime
      }, `Performance warning: ${name} took ${duration.toFixed(2)}ms (threshold: ${logThreshold}ms)`);
    }
  }
}

/**
 * Create a performance-monitored version of a function
 */
export function createMonitoredFunction<T extends (...args: any[]) => any>(
  name: string,
  fn: T,
  logThreshold?: number
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    return measurePerformance(name, () => fn(...args), logThreshold);
  }) as T;
}

/**
 * Create a performance-monitored version of an async function
 */
export function createMonitoredAsyncFunction<T extends (...args: any[]) => Promise<any>>(
  name: string,
  fn: T,
  logThreshold?: number
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return await measurePerformanceAsync(name, () => fn(...args), logThreshold);
  }) as T;
}

/**
 * Get performance metrics for monitoring
 */
export function getPerformanceMetrics() {
  return Object.entries(metrics).map(([name, metric]) => ({
    name,
    count: metric.count,
    avgTime: metric.avgTime,
    minTime: metric.minTime,
    maxTime: metric.maxTime,
    totalTime: metric.totalTime,
    lastMeasured: new Date(metric.lastMeasured).toISOString()
  }));
}

/**
 * Reset performance metrics
 */
export function resetPerformanceMetrics() {
  Object.keys(metrics).forEach(key => {
    delete metrics[key];
  });
}

/**
 * Simple memory usage monitoring
 */
export function getMemoryUsage() {
  const memoryUsage = process.memoryUsage();
  return {
    rss: formatBytes(memoryUsage.rss),
    heapTotal: formatBytes(memoryUsage.heapTotal),
    heapUsed: formatBytes(memoryUsage.heapUsed),
    external: formatBytes(memoryUsage.external),
    arrayBuffers: formatBytes(memoryUsage.arrayBuffers || 0)
  };
}

/**
 * Format bytes to human-readable format
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
}
