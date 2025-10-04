/**
 * Prediction Store - State management for betting insights and predictions
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PredictionProbabilities {
  homeWin: number;
  draw: number;
  awayWin: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface BettingInsights {
  expectedGoals: {
    home: number;
    away: number;
    differential: number;
  };
  formTrend: {
    home: {
      last5Points: number;
      goalsScored: number;
      goalsConceded: number;
      trend: 'improving' | 'declining' | 'stable';
      formString: string;
    };
    away: {
      last5Points: number;
      goalsScored: number;
      goalsConceded: number;
      trend: 'improving' | 'declining' | 'stable';
      formString: string;
    };
  };
  headToHead: {
    totalMatches: number;
    homeWins: number;
    draws: number;
    awayWins: number;
    lastMeetingDate: string | null;
    lastMeetingScore: string | null;
  };
  injuryImpact: {
    home: {
      keyPlayersOut: number;
      impactScore: number;
      affectedPositions: string[];
    };
    away: {
      keyPlayersOut: number;
      impactScore: number;
      affectedPositions: string[];
    };
  };
  venueAdvantage: {
    homeWinRate: number;
    averageHomeGoals: number;
    recentHomeForm: string;
  };
}

export interface KeyFactor {
  factor: string;
  impact: number;
  description: string;
  category: 'form' | 'xg' | 'h2h' | 'venue' | 'injuries';
}

export interface BettingSuggestion {
  type: 'match_result' | 'over_under' | 'both_teams_score';
  recommendation: string;
  confidence: number;
  rationale: string;
}

export interface EnhancedPrediction {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  league: string | null;
  kickoff: string;
  
  predictions: PredictionProbabilities;
  insights: BettingInsights;
  
  reasoning: {
    topFactors: KeyFactor[];
    dataQuality: {
      completeness: number;
      recency: string;
      sources: string[];
    };
  };
  
  suggestedBets: BettingSuggestion[];
  
  additionalMarkets: {
    over25Goals: number;
    btts: number;
    bothTeamsToScore: number;
  };
}

interface PredictionState {
  predictions: Map<number, EnhancedPrediction>;
  selectedFixtureId: number | null;
  isGenerating: boolean;
  error: string | null;
  
  // Actions
  generatePrediction: (fixtureId: number) => Promise<void>;
  getPrediction: (fixtureId: number) => EnhancedPrediction | undefined;
  clearPredictions: () => void;
  setSelectedFixture: (fixtureId: number | null) => void;
}

export const usePredictionStore = create<PredictionState>()(
  persist(
    (set, get) => ({
      predictions: new Map(),
      selectedFixtureId: null,
      isGenerating: false,
      error: null,
      
      generatePrediction: async (fixtureId: number) => {
        set({ isGenerating: true, error: null });
        
        try {
          const response = await fetch(`/api/predictions/${fixtureId}/insights`, {
            headers: {
              'Accept': 'application/json',
            }
          });
          
          if (!response.ok) {
            throw new Error(`Failed to generate prediction: ${response.statusText}`);
          }
          
          const data: EnhancedPrediction = await response.json();
          
          set(state => {
            const newPredictions = new Map(state.predictions);
            newPredictions.set(fixtureId, data);
            return {
              predictions: newPredictions,
              selectedFixtureId: fixtureId,
              isGenerating: false,
              error: null
            };
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to generate prediction';
          set({ 
            isGenerating: false, 
            error: errorMessage 
          });
          console.error('Prediction generation error:', error);
        }
      },
      
      getPrediction: (fixtureId: number) => {
        return get().predictions.get(fixtureId);
      },
      
      clearPredictions: () => {
        set({ 
          predictions: new Map(), 
          selectedFixtureId: null,
          error: null 
        });
      },
      
      setSelectedFixture: (fixtureId: number | null) => {
        set({ selectedFixtureId: fixtureId });
      }
    }),
    {
      name: 'prediction-storage',
      // Only persist predictions, not loading states
      partialize: (state) => ({
        predictions: Array.from(state.predictions.entries()),
        selectedFixtureId: state.selectedFixtureId
      }),
      // Restore Map from serialized array
      merge: (persistedState: any, currentState) => ({
        ...currentState,
        ...persistedState,
        predictions: new Map(persistedState.predictions || [])
      })
    }
  )
);
