import { Suspense, lazy, useState, useEffect } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { LoadingState } from '@/components/loading';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  minHeight?: string;
}

export function LazyWrapper({ children, fallback, errorFallback, minHeight = '200px' }: LazyWrapperProps) {
  const defaultFallback = fallback || <LoadingState message="Loading component..." />;
  const [isOffline, setIsOffline] = useState(false);
  
  // Check if we're in offline mode
  useEffect(() => {
    const checkOfflineStatus = () => {
      setIsOffline(localStorage.getItem('serverStatus') === 'offline' || window.isServerOffline === true);
    };
    
    // Initial check
    checkOfflineStatus();
    
    // Listen for changes
    window.addEventListener('serverStatusChange', checkOfflineStatus);
    
    return () => {
      window.removeEventListener('serverStatusChange', checkOfflineStatus);
    };
  }, []);
  
  return (
    <ErrorBoundary fallback={errorFallback}>
      <div style={{ minHeight }} className="relative">
        <Suspense fallback={defaultFallback}>
          {children}
          {isOffline && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
              <i className="fas fa-wifi-slash mr-1"></i>
              Showing offline data
            </div>
          )}
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}

// Add retry logic for lazy loading components
const retryLazyLoad = (importFn: () => Promise<any>, retries = 3, interval = 1500) => {
  return new Promise<any>((resolve, reject) => {
    importFn()
      .then(resolve)
      .catch((error) => {
        // When we're in offline mode, don't retry to avoid unnecessary network requests
        const isOffline = localStorage.getItem('serverStatus') === 'offline' || window.isServerOffline === true;
        if (retries === 0 || isOffline) {
          // Last attempt failed or we're offline
          reject(error);
          return;
        }
        
        // Retry after delay
        setTimeout(() => {
          retryLazyLoad(importFn, retries - 1, interval)
            .then(resolve)
            .catch(reject);
        }, interval);
      });
  });
};

// Lazy load heavy components for better performance
export const LazyDataVisualization = lazy(() => 
  retryLazyLoad(() => import('@/components/data-visualization').then(module => ({ default: module.DataVisualization })))
);

export const LazyScrapedInsights = lazy(() => 
  retryLazyLoad(() => import('@/components/scraped-insights').then(module => ({ default: module.ScrapedInsights })))
);

export const LazyTeamPerformance = lazy(() => 
  retryLazyLoad(() => import('@/components/team-performance').then(module => ({ default: module.TeamPerformance })))
);

export const LazyDetailedPredictionAnalysis = lazy(() => 
  retryLazyLoad(() => import('@/components/detailed-prediction-analysis').then(module => ({ default: module.DetailedPredictionAnalysis })))
);

export const LazyLiveMatches = lazy(() => 
  retryLazyLoad(() => import('@/components/live-matches').then(module => ({ default: module.LiveMatches })))
);

export const LazyPredictionsPanel = lazy(() => 
  retryLazyLoad(() => import('@/components/predictions-panel').then(module => ({ default: module.PredictionsPanel })))
);

export const LazyLeagueStandings = lazy(() => 
  retryLazyLoad(() => import('@/components/league-standings').then(module => ({ default: module.LeagueStandings })))
);

export const LazyQuickStats = lazy(() => 
  retryLazyLoad(() => import('@/components/quick-stats').then(module => ({ default: module.QuickStats })))
);

export const LazyMatchPredictionCard = lazy(() => 
  retryLazyLoad(() => import('@/components/match-prediction-card').then(module => ({ default: module.MatchPredictionCard })))
);

export const LazyBettingInsightsSelector = lazy(() => 
  retryLazyLoad(() => import('@/components/betting-insights-selector').then(module => ({ default: module.BettingInsightsSelector })))
);

// HOC for wrapping components with lazy loading
export function withLazyLoading<T extends object>(
  Component: React.ComponentType<T>,
  loadingMessage?: string
) {
  return function LazyComponent(props: T) {
    return (
      <LazyWrapper fallback={<LoadingState message={loadingMessage} />}>
        <Component {...props} />
      </LazyWrapper>
    );
  };
}
