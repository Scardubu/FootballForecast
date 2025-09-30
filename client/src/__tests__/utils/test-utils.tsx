/**
 * Custom render utilities for testing React components
 */

import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Router } from 'wouter';

// Create a custom render function that includes providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  // Create a new QueryClient for each test to ensure isolation
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        {children}
      </Router>
    </QueryClientProvider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options });

// Mock data generators
export const mockFixture = (overrides = {}) => ({
  id: 1,
  homeTeamId: 33,
  awayTeamId: 50,
  homeScore: 1,
  awayScore: 2,
  status: 'LIVE',
  elapsed: 67,
  venue: 'Old Trafford',
  round: 'Matchday 11',
  date: new Date().toISOString(),
  ...overrides,
});

export const mockTeam = (overrides = {}) => ({
  id: 33,
  name: 'Manchester United',
  logo: 'https://example.com/logo.png',
  country: 'England',
  founded: 1878,
  venue: 'Old Trafford',
  ...overrides,
});

export const mockLeague = (overrides = {}) => ({
  id: 39,
  name: 'Premier League',
  country: 'England',
  logo: 'https://example.com/league.png',
  flag: 'https://example.com/flag.svg',
  season: 2023,
  type: 'League',
  ...overrides,
});

export const mockStanding = (overrides = {}) => ({
  id: 1,
  teamId: 50,
  position: 1,
  played: 10,
  won: 8,
  drawn: 1,
  lost: 1,
  points: 25,
  goalsFor: 24,
  goalsAgainst: 8,
  ...overrides,
});

export function mockApiResponse<T>(data: T, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  } as Response);
}

export function mockApiError(status = 500, message = 'Server Error') {
  return Promise.resolve({
    ok: false,
    status,
    statusText: message,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(message),
  } as Response);
}

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
