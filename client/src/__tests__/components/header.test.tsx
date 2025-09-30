/**
 * Tests for Header component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render, mockApiResponse, mockLeague } from '../utils/test-utils';
import { Header } from '../../components/header';

// Mock the league store
vi.mock('../../hooks/use-league-store', () => ({
  useLeagueStore: () => ({
    selectedLeague: '39',
    setSelectedLeague: vi.fn(),
  }),
}));

describe('Header Component', () => {
  beforeEach(() => {
    // Mock fetch for leagues API
    global.fetch = vi.fn().mockResolvedValue(
      mockApiResponse([
        mockLeague({ id: '39', name: 'Premier League' }),
        mockLeague({ id: '140', name: 'La Liga' }),
        mockLeague({ id: '78', name: 'Bundesliga' }),
      ])
    );
  });

  it('renders the SabiScore logo and title', () => {
    render(<Header />);
    
    expect(screen.getByText('SabiScore')).toBeInTheDocument();
    expect(screen.getByText('Analytics')).toBeInTheDocument();
  });

  it('renders navigation links on desktop', () => {
    render(<Header />);
    
    expect(screen.getByTestId('nav-dashboard')).toBeInTheDocument();
    expect(screen.getByTestId('nav-predictions')).toBeInTheDocument();
    expect(screen.getByTestId('nav-teams')).toBeInTheDocument();
    expect(screen.getByTestId('nav-leagues')).toBeInTheDocument();
    expect(screen.getByTestId('nav-statistics')).toBeInTheDocument();
  });

  it('renders mobile menu button', () => {
    render(<Header />);
    
    const mobileMenuButton = screen.getByLabelText('Open navigation menu');
    expect(mobileMenuButton).toBeInTheDocument();
  });

  it('renders league selector', async () => {
    render(<Header />);
    
    const leagueSelector = screen.getByTestId('league-selector');
    expect(leagueSelector).toBeInTheDocument();
    
    // Wait for leagues to load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/leagues');
    });
  });

  it('renders live indicator', () => {
    render(<Header />);
    
    const liveIndicator = screen.getByTestId('live-indicator');
    expect(liveIndicator).toBeInTheDocument();
    expect(liveIndicator).toHaveAttribute('aria-label', 'Live data indicator');
  });

  it('handles league selection', async () => {
    render(<Header />);
    
    // Wait for leagues to load
    await waitFor(() => {
      expect(screen.getByTestId('league-selector')).toBeInTheDocument();
    });
    
    // Click on league selector
    const selector = screen.getByTestId('league-selector');
    fireEvent.click(selector);
    
    // Should show league options
    await waitFor(() => {
      expect(screen.getByTestId('league-option-39')).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    // Mock API error
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    render(<Header />);
    
    // Should still render without crashing
    expect(screen.getByText('SabiScore')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<Header />);
    
    // Check ARIA labels
    expect(screen.getByLabelText('Open navigation menu')).toBeInTheDocument();
    expect(screen.getByLabelText('Live data indicator')).toBeInTheDocument();
    
    // Check semantic structure
    const header = screen.getByRole('banner');
    expect(header).toBeInTheDocument();
    
    const nav = screen.getByRole('navigation');
    expect(nav).toBeInTheDocument();
  });
});
