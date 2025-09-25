import { create } from 'zustand';

interface LeagueState {
  selectedLeague: string;
  setSelectedLeague: (leagueId: string) => void;
}

type SetState = (fn: (state: LeagueState) => Partial<LeagueState>) => void;

export const useLeagueStore = create<LeagueState>((set: SetState) => ({
  selectedLeague: '39', // Default to Premier League
  setSelectedLeague: (leagueId: string) => set((state) => ({ selectedLeague: leagueId })),
}));

