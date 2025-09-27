/**
 * Performance monitoring and optimization utilities
 */
import React from 'react';

interface PerformanceMetrics {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    // Observe navigation timing
    if ('PerformanceObserver' in window) {
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.logMetric('page-load', {
              domContentLoaded: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
              loadComplete: navEntry.loadEventEnd - navEntry.loadEventStart,
              firstContentfulPaint: this.getFirstContentfulPaint(),
            });
          }
        });
      });

      try {
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (error) {
        console.warn('Navigation timing observer not supported:', error);
      }

      // Observe resource timing for critical resources
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name.includes('chunk') || entry.name.includes('vendor')) {
            this.logMetric(`resource-${entry.name}`, {
              duration: entry.duration,
              transferSize: (entry as PerformanceResourceTiming).transferSize,
            });
          }
        });
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (error) {
        console.warn('Resource timing observer not supported:', error);
      }
    }
  }

  private getFirstContentfulPaint(): number | null {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const paintEntries = performance.getEntriesByType('paint');
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint');
      return fcpEntry ? fcpEntry.startTime : null;
    }
    return null;
  }

  startTiming(name: string): void {
    this.metrics.set(name, {
      name,
      startTime: performance.now(),
    });
  }

  endTiming(name: string): number | null {
    const metric = this.metrics.get(name);
    if (!metric) return null;

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    this.metrics.set(name, {
      ...metric,
      endTime,
      duration,
    });

    // Log slow operations in development
    if (process.env.NODE_ENV === 'development' && duration > 100) {
      console.warn(`⚠️ Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    return duration;
  }

  getMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  private logMetric(name: string, data: any): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance: ${name}`, data);
    }
  }

  // Memory usage monitoring
  getMemoryUsage(): any {
    if ('memory' in performance) {
      return {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
      };
    }
    return null;
  }

  // Clean up observers
  destroy(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const startTiming = (name: string) => performanceMonitor.startTiming(name);
  const endTiming = (name: string) => performanceMonitor.endTiming(name);
  const getMetrics = () => performanceMonitor.getMetrics();
  const getMemoryUsage = () => performanceMonitor.getMemoryUsage();

  return {
    startTiming,
    endTiming,
    getMetrics,
    getMemoryUsage,
  };
}

// HOC for measuring component render time
export function withPerformanceTracking<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: T) {
    React.useEffect(() => {
      performanceMonitor.startTiming(`render-${componentName}`);
      return () => {
        performanceMonitor.endTiming(`render-${componentName}`);
      };
    });

    return <Component {...props} />;
  };
}

// Utility for measuring async operations
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  performanceMonitor.startTiming(name);
  try {
    const result = await operation();
    return result;
  } finally {
    performanceMonitor.endTiming(name);
  }
}

// Debounce utility for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for performance optimization
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Image optimization utilities
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

export function preloadImages(sources: string[]): Promise<void[]> {
  return Promise.all(sources.map(preloadImage));
}

// Bundle size monitoring
export function logBundleInfo(): void {
  if (process.env.NODE_ENV === 'development') {
    // Log chunk information
    const scripts = Array.from(document.querySelectorAll('script[src]'));
    const totalSize = scripts.reduce((size, script) => {
      const src = (script as HTMLScriptElement).src;
      if (src.includes('chunk') || src.includes('vendor')) {
        // Estimate size based on filename patterns (actual size would need server info)
        return size + 1;
      }
      return size;
    }, 0);
    
    console.log(`📦 Loaded ${scripts.length} scripts, ${totalSize} chunks`);
  }
}
