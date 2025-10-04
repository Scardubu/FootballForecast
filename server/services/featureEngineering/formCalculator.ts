/**
 * Form Calculation Service - Analyzes team form and trends
 */

import type { Fixture } from "../../../shared/schema.js";

export interface FormMetrics {
  last5Points: number;
  goalsScored: number;
  goalsConceded: number;
  goalDifference: number;
  trend: 'improving' | 'declining' | 'stable';
  formString: string;
  winRate: number;
}

export class FormCalculator {
  /**
   * Calculate team form from recent matches
   */
  calculateTeamForm(recentMatches: Fixture[], teamId: number): FormMetrics {
    if (!recentMatches || recentMatches.length === 0) {
      return this.getDefaultForm();
    }

    const last5 = recentMatches.slice(0, Math.min(5, recentMatches.length));
    
    let points = 0;
    let goalsScored = 0;
    let goalsConceded = 0;
    let wins = 0;
    
    for (const match of last5) {
      const isHome = match.homeTeamId === teamId;
      const teamGoals = isHome ? (match.homeScore ?? 0) : (match.awayScore ?? 0);
      const opponentGoals = isHome ? (match.awayScore ?? 0) : (match.homeScore ?? 0);
      
      goalsScored += teamGoals;
      goalsConceded += opponentGoals;
      
      if (teamGoals > opponentGoals) {
        points += 3;
        wins += 1;
      } else if (teamGoals === opponentGoals) {
        points += 1;
      }
    }
    
    const goalDifference = goalsScored - goalsConceded;
    const trend = this.calculateTrend(last5, teamId);
    const formString = this.generateFormString(last5, teamId);
    const winRate = last5.length > 0 ? (wins / last5.length) * 100 : 0;
    
    return {
      last5Points: points,
      goalsScored,
      goalsConceded,
      goalDifference,
      trend,
      formString,
      winRate
    };
  }

  /**
   * Calculate trend using weighted recent performance
   */
  private calculateTrend(matches: Fixture[], teamId: number): 'improving' | 'declining' | 'stable' {
    if (matches.length < 3) return 'stable';
    
    // Weights: recent matches weighted more heavily [5, 4, 3, 2, 1]
    const weights = [5, 4, 3, 2, 1];
    let weightedSum = 0;
    let totalWeight = 0;
    
    matches.forEach((match, idx) => {
      const weight = weights[idx] || 1;
      const isHome = match.homeTeamId === teamId;
      const teamGoals = isHome ? (match.homeScore ?? 0) : (match.awayScore ?? 0);
      const opponentGoals = isHome ? (match.awayScore ?? 0) : (match.homeScore ?? 0);
      
      let points = 0;
      if (teamGoals > opponentGoals) points = 3;
      else if (teamGoals === opponentGoals) points = 1;
      
      weightedSum += points * weight;
      totalWeight += weight;
    });
    
    const avgPoints = weightedSum / totalWeight;
    const normalizedTrend = (avgPoints - 1.5) / 1.5; // Normalize to -1 to 1
    
    if (normalizedTrend > 0.3) return 'improving';
    if (normalizedTrend < -0.3) return 'declining';
    return 'stable';
  }

  /**
   * Generate form string (W/D/L format)
   */
  private generateFormString(matches: Fixture[], teamId: number): string {
    return matches.map(match => {
      const isHome = match.homeTeamId === teamId;
      const teamGoals = isHome ? (match.homeScore ?? 0) : (match.awayScore ?? 0);
      const opponentGoals = isHome ? (match.awayScore ?? 0) : (match.homeScore ?? 0);
      
      if (teamGoals > opponentGoals) return 'W';
      if (teamGoals === opponentGoals) return 'D';
      return 'L';
    }).join('');
  }

  /**
   * Default form when no data available
   */
  private getDefaultForm(): FormMetrics {
    return {
      last5Points: 7,
      goalsScored: 5,
      goalsConceded: 5,
      goalDifference: 0,
      trend: 'stable',
      formString: 'WDWDL',
      winRate: 40
    };
  }
}

export const formCalculator = new FormCalculator();
