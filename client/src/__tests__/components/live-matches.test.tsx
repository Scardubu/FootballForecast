/**
 * Tests for LiveMatches component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render, mockApiResponse, mockFixture, mockApiError } from '../utils/test-utils';
import { LiveMatches } from '../../components/live-matches';

describe('LiveMatches Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    // Mock pending fetch
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));
    
    render(<LiveMatches />);
    
    expect(screen.getByText('Loading live matches...')).toBeInTheDocument();
  });

  it('renders live matches when data is available', async () => {
    const mockMatches = [
      mockFixture({
        id: 1,
        homeTeamId: 33,
        awayTeamId: 50,
        homeScore: 1,
        awayScore: 2,
        status: 'LIVE',
        elapsed: 67,
      }),
      mockFixture({
        id: 2,
        homeTeamId: 42,
        awayTeamId: 49,
        homeScore: 2,
        awayScore: 1,
        status: 'HT',
        elapsed: 45,
      }),
    ];

    global.fetch = vi.fn().mockResolvedValue(mockApiResponse(mockMatches));
    
    render(<LiveMatches />);
    
    await waitFor(() => {
      expect(screen.getByText('Live Matches')).toBeInTheDocument();
    });
    
    // Should display match information
    expect(screen.getByText('1 - 2')).toBeInTheDocument();
    expect(screen.getByText('2 - 1')).toBeInTheDocument();
    expect(screen.getByText('LIVE')).toBeInTheDocument();
    expect(screen.getByText('HT')).toBeInTheDocument();
  });

  it('renders empty state when no matches are available', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockApiResponse([]));
    
    render(<LiveMatches />);
    
    await waitFor(() => {
      expect(screen.getByText('No live matches at the moment')).toBeInTheDocument();
    });
    
    expect(screen.getByText('Check back later for live football action!')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockApiError(500, 'Server Error'));
    
    render(<LiveMatches />);
    
    await waitFor(() => {
      expect(screen.getByText('Unable to load live matches')).toBeInTheDocument();
    });
  });

  it('handles non-array data gracefully', async () => {
    // Mock invalid data (not an array)
    global.fetch = vi.fn().mockResolvedValue(mockApiResponse({ error: 'Invalid data' }));
    
    render(<LiveMatches />);
    
    await waitFor(() => {
      // Should not crash and show appropriate message
      expect(screen.getByText('No live matches at the moment')).toBeInTheDocument();
    });
  });

  it('displays match status correctly', async () => {
    const mockMatches = [
      mockFixture({ status: 'LIVE', elapsed: 67 }),
      mockFixture({ status: 'HT', elapsed: 45 }),
      mockFixture({ status: 'FT', elapsed: 90 }),
      mockFixture({ status: 'NS', elapsed: null }),
    ];

    global.fetch = vi.fn().mockResolvedValue(mockApiResponse(mockMatches));
    
    render(<LiveMatches />);
    
    await waitFor(() => {
      expect(screen.getByText('LIVE')).toBeInTheDocument();
      expect(screen.getByText('HT')).toBeInTheDocument();
      expect(screen.getByText('FT')).toBeInTheDocument();
      expect(screen.getByText('NS')).toBeInTheDocument();
    });
  });

  it('has proper accessibility structure', async () => {
    const mockMatches = [mockFixture()];
    global.fetch = vi.fn().mockResolvedValue(mockApiResponse(mockMatches));
    
    render(<LiveMatches />);
    
    await waitFor(() => {
      // Check for proper heading structure
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
      
      // Check for list structure
      const matchList = screen.getByRole('list');
      expect(matchList).toBeInTheDocument();
      
      const matchItems = screen.getAllByRole('listitem');
      expect(matchItems.length).toBeGreaterThan(0);
    });
  });

  it('refreshes data automatically', async () => {
    const mockMatches = [mockFixture()];
    global.fetch = vi.fn().mockResolvedValue(mockApiResponse(mockMatches));
    
    render(<LiveMatches />);
    
    // Initial fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/fixtures/live');
    });
    
    // Should have been called at least once
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
