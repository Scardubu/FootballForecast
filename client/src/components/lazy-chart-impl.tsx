/**
 * Implementation of lazy-loaded chart component
 * This file is code-split and only loaded when charts are visible
 * 
 * CRITICAL: Recharts is bundled with vendor-react to avoid circular dependency errors
 * The "Cannot access 'A' before initialization" error occurs when recharts is isolated
 */

import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';
import type { LazyChartProps } from './lazy-chart';

/**
 * Bar chart implementation using Recharts
 * Bundled with React vendor chunk to prevent circular dependency issues
 */
const LazyChartImpl: React.FC<LazyChartProps> = ({
  data,
  dataKey,
  xAxisKey,
  yAxisLabel,
  barColor = '#8884d8',
  height = 300
}) => {
  // Validate data to prevent runtime errors
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xAxisKey} />
        <YAxis label={{ value: yAxisLabel, angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Bar dataKey={dataKey} fill={barColor} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default LazyChartImpl;
