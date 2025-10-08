import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Prediction } from "@shared/schema";
import { apiClient } from "@/lib/api-client";
import { MockDataProvider } from "@/lib/mock-data-provider";
import { isTestEnv } from "@/lib/env";

const IS_DEV = import.meta.env.DEV === true;
const IS_TEST = isTestEnv();
import { computeTelemetryMetrics } from "@/lib/telemetry-metrics";

const buildQueryKey = (fixtureIds?: number[]) => {
  if (Array.isArray(fixtureIds) && fixtureIds.length > 0) {
    const normalized = [...fixtureIds].sort((a, b) => a - b);
    return ["prediction-telemetry", normalized.join(",")];
  }
  return ["prediction-telemetry", "all"];
};

const fetchTelemetry = async (fixtureIds?: number[]): Promise<Record<number, Prediction | undefined>> => {
  try {
    return await apiClient.getPredictionTelemetry(fixtureIds);
  } catch (error) {
    console.warn("Falling back to mock telemetry due to API error", error);
    if (IS_DEV || IS_TEST) {
      if (typeof window !== "undefined") {
        window.isServerOffline = true;
        localStorage.setItem("serverStatus", "offline");
        window.dispatchEvent(new Event("serverStatusChange"));
      }
      return await MockDataProvider.getPredictionTelemetry(fixtureIds);
    }
    // In production, do not use mock data; return empty telemetry
    return {} as Record<number, Prediction | undefined>;
  }
};

export function useTelemetrySummary(fixtureIds?: number[]) {
  const queryKey = buildQueryKey(fixtureIds);

  const { data, isLoading, isFetching, error, refetch } = useQuery<Record<number, Prediction | undefined>>({
    queryKey,
    queryFn: () => fetchTelemetry(fixtureIds),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const metrics = useMemo(() => computeTelemetryMetrics(data ?? undefined), [data]);

  return {
    telemetry: data ?? {},
    metrics,
    loading: isLoading || isFetching,
    error: error instanceof Error ? error : null,
    refetch,
  };
}
