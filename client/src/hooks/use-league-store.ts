import { create } from 'zustand';

interface LeagueState {
  selectedLeague: string;
  setSelectedLeague: (leagueId: string) => void;
}

export const useLeagueStore = create<LeagueState>((set) => ({
  selectedLeague: '39', // Default to Premier League
  setSelectedLeague: (leagueId) => set({ selectedLeague: leagueId }),
}));
