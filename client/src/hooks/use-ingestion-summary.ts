import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface IngestionSummaryTotals {
  totalEvents: number;
  byStatus: Record<"pending" | "running" | "completed" | "failed" | "degraded", number>;
  fallbackEvents: number;
  retries: number;
}

export interface IngestionSummaryAverages {
  durationMs: number | null;
  recordsWritten: number | null;
}

export interface IngestionSummary {
  generatedAt: string;
  totals: IngestionSummaryTotals;
  averages: IngestionSummaryAverages;
  recentEvents: any[];
  lastSuccessfulEvent?: any;
  lastFailedEvent?: any;
}

const DEFAULT_SUMMARY: IngestionSummary = {
  generatedAt: new Date(0).toISOString(),
  totals: {
    totalEvents: 0,
    byStatus: { pending: 0, running: 0, completed: 0, failed: 0, degraded: 0 },
    fallbackEvents: 0,
    retries: 0,
  },
  averages: { durationMs: null, recordsWritten: null },
  recentEvents: [],
};

export function useIngestionSummary(limit: number = 50) {
  const { data, isLoading, isFetching, error, refetch } = useQuery<IngestionSummary>({
    queryKey: ["ingestion-summary", limit],
    queryFn: async () => {
      try {
        return await apiClient.getIngestionSummary(limit);
      } catch (err) {
        // Return safe defaults on failure
        return DEFAULT_SUMMARY;
      }
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const summary = data ?? DEFAULT_SUMMARY;

  const metrics = {
    total: summary.totals.totalEvents,
    failed: summary.totals.byStatus.failed ?? 0,
    fallbacks: summary.totals.fallbackEvents,
    avgDurationMs: summary.averages.durationMs,
  };

  return {
    summary,
    metrics,
    loading: isLoading || isFetching,
    error: error instanceof Error ? error : null,
    refetch,
  };
}
