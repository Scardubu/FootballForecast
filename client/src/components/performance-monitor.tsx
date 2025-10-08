/**
 * Performance monitoring component for production analytics
 */

import { useEffect } from 'react';

interface PerformanceMetrics {
  navigationTiming?: PerformanceNavigationTiming;
  paintMetrics?: PerformanceEntry[];
  resourceMetrics?: PerformanceResourceTiming[];
  memoryInfo?: any;
}

export function PerformanceMonitor() {
  useEffect(() => {
    // Only run in production to avoid console noise in development
    if (process.env.NODE_ENV !== 'production') {
      // Silently skip in development
      return;
    }

    const collectMetrics = () => {
      const metrics: PerformanceMetrics = {};

      // Navigation timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        metrics.navigationTiming = navigation;
      }

      // Paint metrics (FCP, LCP)
      const paintEntries = performance.getEntriesByType('paint');
      if (paintEntries.length > 0) {
        metrics.paintMetrics = paintEntries;
      }

      // Resource timing for critical resources
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const criticalResources = resources.filter(resource => 
        resource.name.includes('chunk') || 
        resource.name.includes('vendor') ||
        resource.name.includes('.css')
      );
      if (criticalResources.length > 0) {
        metrics.resourceMetrics = criticalResources;
      }

      // Memory info (if available)
      if ('memory' in performance) {
        metrics.memoryInfo = (performance as any).memory;
      }

      // Log metrics for analytics
      console.log('📊 Performance Metrics:', {
        // Core Web Vitals
        fcp: paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime,
        domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
        loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
        
        // Resource loading
        totalResources: resources.length,
        criticalResourcesCount: criticalResources.length,
        avgResourceLoadTime: criticalResources.reduce((sum, r) => sum + r.duration, 0) / criticalResources.length,
        
        // Memory usage
        memoryUsage: metrics.memoryInfo ? {
          used: Math.round(metrics.memoryInfo.usedJSHeapSize / 1024 / 1024),
          total: Math.round(metrics.memoryInfo.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(metrics.memoryInfo.jsHeapSizeLimit / 1024 / 1024),
        } : null,
        
        // Bundle info
        bundleCount: resources.filter(r => r.name.includes('assets/')).length,
        timestamp: new Date().toISOString(),
      });

      // Send to analytics service (if configured)
      if ((window as any).gtag) {
        (window as any).gtag('event', 'performance_metrics', {
          custom_parameter: JSON.stringify(metrics),
        });
      }
    };

    // Collect metrics after page load
    if (document.readyState === 'complete') {
      setTimeout(collectMetrics, 1000);
    } else {
      window.addEventListener('load', () => {
        setTimeout(collectMetrics, 1000);
      });
    }

    // Monitor for performance issues (production only, critical issues only)
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        // Only log extremely slow resources (> 5s) to reduce noise
        if (entry.entryType === 'resource' && entry.duration > 5000) {
          console.warn('🐌 Critical slow resource:', {
            name: entry.name.split('/').pop(), // Only filename
            duration: Math.round(entry.duration) + 'ms',
          });
        }
        
        // Only log severe layout shifts (CLS > 0.25) to reduce noise
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          const value = (entry as any).value;
          if (value > 0.25) {
            console.warn('📐 Critical layout shift:', {
              value: value.toFixed(3),
            });
          }
        }
      });
    });

    // Observe resource and layout shift entries
    try {
      observer.observe({ entryTypes: ['resource', 'layout-shift'] });
    } catch (error) {
      // Silently fail if not supported
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  // This component doesn't render anything
  return null;
}

// Utility function to measure component render time
export function withPerformanceTracking<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  return function PerformanceTrackedComponent(props: P) {
    useEffect(() => {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        if (renderTime > 16) { // Longer than one frame (60fps)
          console.warn(`🎭 Slow component render: ${componentName} took ${renderTime.toFixed(2)}ms`);
        }
      };
    });

    return <Component {...props} />;
  };
}

// Hook for measuring async operations
export function usePerformanceMeasure() {
  return {
    measure: (name: string, fn: () => Promise<any>) => {
      const startTime = performance.now();
      
      return fn().finally(() => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
        
        // Mark slow operations
        if (duration > 1000) {
          console.warn(`🐌 Slow operation: ${name} took ${duration.toFixed(2)}ms`);
        }
      });
    }
  };
}
