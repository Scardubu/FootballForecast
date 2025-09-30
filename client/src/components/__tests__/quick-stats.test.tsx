import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { QuickStats } from '../quick-stats';
import { useTelemetrySummary } from '@/hooks/use-telemetry';
import { createMockTelemetryMetrics } from '@/lib/telemetry-test-utils';

// Mock the telemetry hook
vi.mock('@/hooks/use-telemetry');

const mockUseTelemetrySummary = vi.mocked(useTelemetrySummary);

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('QuickStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state', () => {
    mockUseTelemetrySummary.mockReturnValue({
      telemetry: {},
      metrics: createMockTelemetryMetrics({ totalFixtures: 0 }),
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<QuickStats />, { wrapper: createWrapper() });

    expect(screen.getByText("Today's Insights")).toBeInTheDocument();
    expect(screen.getAllByTestId(/skeleton/i)).toHaveLength(3);
  });

  it('should render telemetry metrics', () => {
    const mockMetrics = createMockTelemetryMetrics({
      totalFixtures: 5,
      calibratedFixtures: 4,
      calibrationRate: 0.8,
      averageLatencyMs: 250,
      p95LatencyMs: 350,
    });

    mockUseTelemetrySummary.mockReturnValue({
      telemetry: {},
      metrics: mockMetrics,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<QuickStats />, { wrapper: createWrapper() });

    expect(screen.getByTestId('insight-fixtures')).toBeInTheDocument();
    expect(screen.getByText('5 active fixtures')).toBeInTheDocument();
    
    expect(screen.getByTestId('insight-calibration')).toBeInTheDocument();
    expect(screen.getByText('80% calibrated · 4 ready')).toBeInTheDocument();
    
    expect(screen.getByTestId('insight-latency')).toBeInTheDocument();
    expect(screen.getByText('Avg 250 ms · P95 350 ms')).toBeInTheDocument();
  });

  it('should handle empty fixtures state', () => {
    const mockMetrics = createMockTelemetryMetrics({
      totalFixtures: 0,
      calibratedFixtures: 0,
      calibrationRate: null,
      averageLatencyMs: null,
    });

    mockUseTelemetrySummary.mockReturnValue({
      telemetry: {},
      metrics: mockMetrics,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<QuickStats />, { wrapper: createWrapper() });

    expect(screen.getByText('Awaiting fixtures')).toBeInTheDocument();
    expect(screen.getByText('N/A calibrated · 0 ready')).toBeInTheDocument();
    expect(screen.getByText('Avg N/A · P95 N/A')).toBeInTheDocument();
  });

  it('should display error state', () => {
    const mockMetrics = createMockTelemetryMetrics();

    mockUseTelemetrySummary.mockReturnValue({
      telemetry: {},
      metrics: mockMetrics,
      loading: false,
      error: new Error('Network error'),
      refetch: vi.fn(),
    });

    render(<QuickStats />, { wrapper: createWrapper() });

    expect(screen.getByTestId('insight-error')).toBeInTheDocument();
    expect(screen.getByText('Telemetry offline – showing cached values')).toBeInTheDocument();
  });

  it('should format high latency values correctly', () => {
    const mockMetrics = createMockTelemetryMetrics({
      averageLatencyMs: 1500,
      p95LatencyMs: 2300,
    });

    mockUseTelemetrySummary.mockReturnValue({
      telemetry: {},
      metrics: mockMetrics,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<QuickStats />, { wrapper: createWrapper() });

    expect(screen.getByText('Avg 1.5 s · P95 2.3 s')).toBeInTheDocument();
  });

  it('should have correct test ids for accessibility', () => {
    const mockMetrics = createMockTelemetryMetrics();

    mockUseTelemetrySummary.mockReturnValue({
      telemetry: {},
      metrics: mockMetrics,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<QuickStats />, { wrapper: createWrapper() });

    expect(screen.getByTestId('quick-stats')).toBeInTheDocument();
    expect(screen.getByTestId('insight-fixtures')).toBeInTheDocument();
    expect(screen.getByTestId('insight-calibration')).toBeInTheDocument();
    expect(screen.getByTestId('insight-latency')).toBeInTheDocument();
  });
});
