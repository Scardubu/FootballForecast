/**
 * Lazy-loaded chart wrapper to reduce initial bundle size
 * Charts are loaded on-demand when the component is rendered
 * CRITICAL: Import recharts as a single module to avoid bundle bloat
 */

import React, { Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

// Lazy load the entire chart component to avoid splitting recharts into multiple chunks
const LazyBarChartComponent = lazy(() => import('./lazy-chart-impl'));

// Chart loading skeleton
const ChartSkeleton = () => (
  <Card>
    <CardContent className="p-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-64 w-full" />
      </div>
    </CardContent>
  </Card>
);

// Props type for the chart
export interface LazyChartProps {
  data: any[];
  dataKey: string;
  xAxisKey: string;
  yAxisLabel?: string;
  barColor?: string;
  height?: number;
}

/**
 * Lazy-loaded bar chart component
 * Only loads Recharts library when rendered
 */
export const LazyChart: React.FC<LazyChartProps> = (props) => {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <LazyBarChartComponent {...props} />
    </Suspense>
  );
};

export default LazyChart;
