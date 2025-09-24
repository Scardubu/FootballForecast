import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /**
   * Accessible label for screen readers
   * @default 'Loading'
   */
  ariaLabel?: string;
  /**
   * Data test ID for component testing
   */
  'data-testid'?: string;
}

export const LoadingSpinner = React.memo(function LoadingSpinner({ 
  size = 'md', 
  className = '', 
  ariaLabel = 'Loading',
  'data-testid': dataTestId = 'loading-spinner'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };

  return (
    <div 
      className={cn(`animate-spin rounded-full border-2 border-primary border-t-transparent ${sizeClasses[size]}`, className)} 
      role="progressbar"
      aria-label={ariaLabel}
      data-testid={dataTestId}
    />
  );
});

interface LoadingStateProps {
  message?: string;
  showSpinner?: boolean;
  className?: string;
  /**
   * Priority for screen reader announcements
   * @default 'polite'
   */
  announcementPriority?: 'polite' | 'assertive';
  /**
   * Data test ID for component testing
   */
  'data-testid'?: string;
}

export const LoadingState = React.memo(function LoadingState({ 
  message = 'Loading...', 
  showSpinner = true, 
  className = '',
  announcementPriority = 'polite',
  'data-testid': dataTestId = 'loading-state'
}: LoadingStateProps) {
  return (
    <div 
      className={cn('flex flex-col items-center justify-center p-8 text-center', className)}
      role="status"
      aria-live={announcementPriority}
      aria-busy="true"
      data-testid={dataTestId}
    >
      {showSpinner && <LoadingSpinner size="lg" className="mb-4" />}
      <p className="text-muted-foreground animate-pulse">{message}</p>
    </div>
  );
});

interface SkeletonComponentProps {
  'data-testid'?: string;
}

export const MatchCardSkeleton = React.memo(function MatchCardSkeleton({ 'data-testid': dataTestId = 'match-card-skeleton' }: SkeletonComponentProps) {
  return (
    <Card 
      className="hover-lift"
      data-testid={dataTestId}
      aria-busy="true">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-6" />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-6" />
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-6 w-16" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export const PredictionCardSkeleton = React.memo(function PredictionCardSkeleton({ 'data-testid': dataTestId = 'prediction-card-skeleton' }: SkeletonComponentProps) {
  return (
    <Card 
      className="hover-lift"
      data-testid={dataTestId}
      aria-busy="true">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-4 w-8" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-8 w-12 mx-auto mb-2" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          ))}
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-2 w-24" />
              <Skeleton className="h-4 w-8" />
            </div>
          </div>
          
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-border">
          <Skeleton className="h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  );
});

export const StandingsTableSkeleton = React.memo(function StandingsTableSkeleton({ 'data-testid': dataTestId = 'standings-table-skeleton' }: SkeletonComponentProps) {
  return (
    <Card
      data-testid={dataTestId}
      aria-busy="true">
      <CardContent className="p-6">
        <Skeleton className="h-6 w-32 mb-4" />
        <div className="space-y-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-24 flex-1" />
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-4 w-6" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
});

interface SkeletonGridProps {
  count?: number;
  component?: React.ComponentType<any>;
  className?: string;
  /**
   * Data test ID prefix for component testing
   */
  'data-testid'?: string;
}

export const SkeletonGrid = React.memo(function SkeletonGrid({ 
  count = 3, 
  component: Component = MatchCardSkeleton, 
  className = '',
  'data-testid': dataTestId = 'skeleton-grid'
}: SkeletonGridProps) {
  return (
    <div 
      className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6', className)}
      data-testid={dataTestId}
      role="group"
      aria-label="Loading content"
      aria-busy="true"
    >
      {[...Array(count)].map((_, i) => {
        const componentProps = {
          key: i,
          'data-testid': `${dataTestId}-item-${i}`
        };
        return <Component {...componentProps} />;
      })}
    </div>
  );
});
