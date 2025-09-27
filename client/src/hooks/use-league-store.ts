import { create } from 'zustand';

interface LeagueState {
  selectedLeague: string;
  selectedSeason: string;
  setSelectedLeague: (leagueId: string) => void;
  setSelectedSeason: (season: string) => void;
}

type SetState = (fn: (state: LeagueState) => Partial<LeagueState>) => void;

export const DEFAULT_LEAGUE = '39'; // Premier League
export const DEFAULT_SEASON = '2023'; // API-Football free plan support

export const useLeagueStore = create<LeagueState>((set: SetState) => ({
  selectedLeague: DEFAULT_LEAGUE,
  selectedSeason: DEFAULT_SEASON,
  setSelectedLeague: (leagueId: string) => set((state) => ({ selectedLeague: leagueId })),
  setSelectedSeason: (season: string) => set((state) => ({ selectedSeason: season })),
}));

