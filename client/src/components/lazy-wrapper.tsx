import { Suspense, lazy } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { LoadingState } from '@/components/loading';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
}

export function LazyWrapper({ children, fallback, errorFallback }: LazyWrapperProps) {
  const defaultFallback = fallback || <LoadingState message="Loading component..." />;
  
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={defaultFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
}

// Lazy load heavy components for better performance
export const LazyDataVisualization = lazy(() => 
  import('@/components/data-visualization').then(module => ({ default: module.DataVisualization }))
);

export const LazyScrapedInsights = lazy(() => 
  import('@/components/scraped-insights').then(module => ({ default: module.ScrapedInsights }))
);

export const LazyTeamPerformance = lazy(() => 
  import('@/components/team-performance').then(module => ({ default: module.TeamPerformance }))
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
