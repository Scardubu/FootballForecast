import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Header } from '../header';
import { useTelemetrySummary } from '@/hooks/use-telemetry';
import { useLeagueStore } from '@/hooks/use-league-store';
import { createMockTelemetryMetrics } from '@/lib/telemetry-test-utils';

// Mock dependencies
vi.mock('@/hooks/use-telemetry');
vi.mock('@/hooks/use-league-store');
vi.mock('wouter', () => ({
  Link: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
  useLocation: () => ['/'],
}));

const mockUseTelemetrySummary = vi.mocked(useTelemetrySummary);
const mockUseLeagueStore = vi.mocked(useLeagueStore);

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

// Mock fetch for leagues
global.fetch = vi.fn();

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    mockUseLeagueStore.mockReturnValue({
      selectedLeague: '39',
      setSelectedLeague: vi.fn(),
      selectedSeason: '2023',
      setSelectedSeason: vi.fn(),
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve([
        { id: '39', name: 'Premier League' },
        { id: '140', name: 'La Liga' },
      ]),
    });
  });

  it('should render header with navigation', () => {
    mockUseTelemetrySummary.mockReturnValue({
      telemetry: {},
      metrics: createMockTelemetryMetrics(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Header />, { wrapper: createWrapper() });

    expect(screen.getAllByText('SabiScore')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Analytics')[0]).toBeInTheDocument();
    expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('nav-betting-insights')).toBeInTheDocument();
    expect(screen.getByTestId('nav-predictions')).toBeInTheDocument();
    expect(screen.getByTestId('nav-statistics')).toBeInTheDocument();
    expect(screen.getByTestId('nav-telemetry')).toBeInTheDocument();
    expect(screen.getByTestId('live-indicator')).toBeInTheDocument();
  });

  it('should display telemetry badge on desktop', () => {
    const mockMetrics = createMockTelemetryMetrics({
      calibrationRate: 0.85,
      averageLatencyMs: 200,
    });

    mockUseTelemetrySummary.mockReturnValue({
      telemetry: {},
      metrics: mockMetrics,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Header />, { wrapper: createWrapper() });

    // Badge should be hidden on smaller screens but present in DOM
    const badge = screen.getByText(/Calibration 85%/);
    expect(badge).toBeInTheDocument();
    expect(screen.getByText(/Latency 200 ms/)).toBeInTheDocument();
  });

  it('should show loading state for telemetry', () => {
    mockUseTelemetrySummary.mockReturnValue({
      telemetry: {},
      metrics: createMockTelemetryMetrics(),
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    render(<Header />, { wrapper: createWrapper() });

    // Should show skeleton loader
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('should show error state for telemetry', () => {
    mockUseTelemetrySummary.mockReturnValue({
      telemetry: {},
      metrics: createMockTelemetryMetrics(),
      loading: false,
      error: new Error('API Error'),
      refetch: vi.fn(),
    });

    render(<Header />, { wrapper: createWrapper() });

    // Badge should have destructive variant when there's an error
    const badge = document.querySelector('[class*="destructive"]');
    expect(badge).toBeInTheDocument();
  });

  it('should format latency values correctly', () => {
    const mockMetrics = createMockTelemetryMetrics({
      calibrationRate: 0.92,
      averageLatencyMs: 1250,
    });

    mockUseTelemetrySummary.mockReturnValue({
      telemetry: {},
      metrics: mockMetrics,
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Header />, { wrapper: createWrapper() });

    expect(screen.getByText(/Calibration 92%/)).toBeInTheDocument();
    expect(screen.getByText(/Latency 1.3 s/)).toBeInTheDocument();
  });

  it('should handle null telemetry values', () => {
    const mockMetrics = createMockTelemetryMetrics({
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

    render(<Header />, { wrapper: createWrapper() });

    expect(screen.getByText(/Calibration N\/A/)).toBeInTheDocument();
    expect(screen.getByText(/Latency N\/A/)).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    mockUseTelemetrySummary.mockReturnValue({
      telemetry: {},
      metrics: createMockTelemetryMetrics(),
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    render(<Header />, { wrapper: createWrapper() });

    const liveIndicator = screen.getByTestId('live-indicator');
    expect(liveIndicator).toHaveAttribute('aria-label', 'Live data indicator');
  });
});
