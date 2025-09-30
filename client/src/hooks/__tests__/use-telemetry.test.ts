import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useTelemetrySummary } from '../use-telemetry';
import { apiClient } from '@/lib/api-client';
import { MockDataProvider } from '@/lib/mock-data-provider';
import { createMockTelemetryMap, MOCK_TELEMETRY_SCENARIOS } from '@/lib/telemetry-test-utils';

// Mock dependencies
vi.mock('@/lib/api-client');
vi.mock('@/lib/mock-data-provider');

const mockApiClient = vi.mocked(apiClient);
const mockMockDataProvider = vi.mocked(MockDataProvider);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );
};

describe('useTelemetrySummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset window state
    delete (window as any).isServerOffline;
    localStorage.removeItem('serverStatus');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch telemetry data successfully', async () => {
    const mockTelemetry = createMockTelemetryMap([1001, 1002]);
    mockApiClient.getPredictionTelemetry.mockResolvedValue(mockTelemetry);

    const { result } = renderHook(() => useTelemetrySummary(), {
      wrapper: createWrapper(),
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.telemetry).toEqual(mockTelemetry);
    expect(result.current.metrics.totalFixtures).toBe(2);
    expect(result.current.error).toBeNull();
    expect(mockApiClient.getPredictionTelemetry).toHaveBeenCalledWith(undefined);
  });

  it('should fetch telemetry data with specific fixture IDs', async () => {
    const fixtureIds = [1001, 1002];
    const mockTelemetry = createMockTelemetryMap(fixtureIds);
    mockApiClient.getPredictionTelemetry.mockResolvedValue(mockTelemetry);

    const { result } = renderHook(() => useTelemetrySummary(fixtureIds), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockApiClient.getPredictionTelemetry).toHaveBeenCalledWith(fixtureIds);
  });

  it('should fallback to mock data on API error', async () => {
    const mockTelemetry = createMockTelemetryMap([1001]);
    mockApiClient.getPredictionTelemetry.mockRejectedValue(new Error('Network error'));
    mockMockDataProvider.getPredictionTelemetry.mockResolvedValue(mockTelemetry);

    const { result } = renderHook(() => useTelemetrySummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.telemetry).toEqual(mockTelemetry);
    expect(mockMockDataProvider.getPredictionTelemetry).toHaveBeenCalledWith(undefined);
    expect((window as any).isServerOffline).toBe(true);
    expect(localStorage.getItem('serverStatus')).toBe('offline');
  });

  it('should compute correct metrics for empty telemetry', async () => {
    mockApiClient.getPredictionTelemetry.mockResolvedValue({});

    const { result } = renderHook(() => useTelemetrySummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.metrics).toEqual({
      totalFixtures: 0,
      calibratedFixtures: 0,
      uncalibratedFixtures: 0,
      calibrationRate: null,
      averageLatencyMs: null,
      p95LatencyMs: null,
      maxLatencyMs: null,
      serviceLatencyAverageMs: null,
      latestUpdatedAt: null,
    });
  });

  it('should compute correct metrics for mixed calibration states', async () => {
    const mockTelemetry = MOCK_TELEMETRY_SCENARIOS.multiple;
    mockApiClient.getPredictionTelemetry.mockResolvedValue(mockTelemetry);

    const { result } = renderHook(() => useTelemetrySummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const { metrics } = result.current;
    expect(metrics.totalFixtures).toBe(3);
    expect(metrics.calibratedFixtures).toBe(2);
    expect(metrics.uncalibratedFixtures).toBe(1);
    expect(metrics.calibrationRate).toBeCloseTo(0.67, 2);
    expect(metrics.averageLatencyMs).toBeGreaterThan(0);
  });

  it('should handle high latency scenarios', async () => {
    const mockTelemetry = MOCK_TELEMETRY_SCENARIOS.highLatency;
    mockApiClient.getPredictionTelemetry.mockResolvedValue(mockTelemetry);

    const { result } = renderHook(() => useTelemetrySummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    const { metrics } = result.current;
    expect(metrics.averageLatencyMs).toBeGreaterThan(1000);
    expect(metrics.maxLatencyMs).toBeGreaterThan(1500);
  });

  it('should provide refetch functionality', async () => {
    const mockTelemetry = createMockTelemetryMap([1001]);
    mockApiClient.getPredictionTelemetry.mockResolvedValue(mockTelemetry);

    const { result } = renderHook(() => useTelemetrySummary(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(typeof result.current.refetch).toBe('function');
    
    // Test refetch
    result.current.refetch();
    expect(mockApiClient.getPredictionTelemetry).toHaveBeenCalledTimes(2);
  });
});
