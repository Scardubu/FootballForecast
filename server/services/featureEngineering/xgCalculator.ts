/**
 * Expected Goals (xG) Calculator - Poisson-based estimation
 */

export interface XGMetrics {
  home: number;
  away: number;
  differential: number;
  totalGoals: number;
  homeCleanSheetProb: number;
  awayCleanSheetProb: number;
}

interface TeamStatsInput {
  goalsPerGame: number;
  goalsConcededPerGame: number;
  cleanSheets?: number;
  matchesPlayed?: number;
}

const LEAGUE_AVG_GOALS = 2.7; // Average goals per team per match

export class XGCalculator {
  /**
   * Estimate expected goals using Poisson-based model
   */
  estimateExpectedGoals(
    homeStats: TeamStatsInput,
    awayStats: TeamStatsInput,
    isHomeGround: boolean = true
  ): XGMetrics {
    // Attack strength = team's goals per game / league average
    const homeAttackStrength = this.calculateStrength(homeStats.goalsPerGame);
    const awayAttackStrength = this.calculateStrength(awayStats.goalsPerGame);
    
    // Defense strength = team's goals conceded per game / league average
    const homeDefenseStrength = this.calculateStrength(homeStats.goalsConcededPerGame);
    const awayDefenseStrength = this.calculateStrength(awayStats.goalsConcededPerGame);
    
    // Home advantage boost (15% increase in attack)
    const venueBoost = isHomeGround ? 1.15 : 1.0;
    
    // Calculate xG: Attack Strength × Opponent Defense Strength × League Average × Venue Boost
    const homeXG = homeAttackStrength * awayDefenseStrength * LEAGUE_AVG_GOALS * venueBoost;
    const awayXG = awayAttackStrength * homeDefenseStrength * LEAGUE_AVG_GOALS;
    
    // Calculate clean sheet probabilities using Poisson distribution
    const homeCleanSheetProb = this.calculateCleanSheetProbability(awayXG);
    const awayCleanSheetProb = this.calculateCleanSheetProbability(homeXG);
    
    return {
      home: Number(homeXG.toFixed(2)),
      away: Number(awayXG.toFixed(2)),
      differential: Number((homeXG - awayXG).toFixed(2)),
      totalGoals: Number((homeXG + awayXG).toFixed(2)),
      homeCleanSheetProb: Number((homeCleanSheetProb * 100).toFixed(1)),
      awayCleanSheetProb: Number((awayCleanSheetProb * 100).toFixed(1))
    };
  }

  /**
   * Calculate quick xG estimate from recent form
   */
  estimateFromForm(
    homeGoalsScored: number,
    homeGoalsConceded: number,
    awayGoalsScored: number,
    awayGoalsConceded: number,
    matchesPlayed: number = 5
  ): XGMetrics {
    const homeStats: TeamStatsInput = {
      goalsPerGame: homeGoalsScored / matchesPlayed,
      goalsConcededPerGame: homeGoalsConceded / matchesPlayed
    };
    
    const awayStats: TeamStatsInput = {
      goalsPerGame: awayGoalsScored / matchesPlayed,
      goalsConcededPerGame: awayGoalsConceded / matchesPlayed
    };
    
    return this.estimateExpectedGoals(homeStats, awayStats, true);
  }

  /**
   * Calculate strength relative to league average
   */
  private calculateStrength(value: number): number {
    if (value <= 0) return 0.5; // Minimum strength
    return value / LEAGUE_AVG_GOALS;
  }

  /**
   * Calculate clean sheet probability using Poisson distribution
   * P(0 goals) = e^(-λ) where λ is expected goals
   */
  private calculateCleanSheetProbability(expectedGoals: number): number {
    return Math.exp(-expectedGoals);
  }

  /**
   * Calculate probability of over 2.5 goals
   */
  calculateOver25Probability(totalXG: number): number {
    // Using Poisson: P(X > 2.5) ≈ 1 - P(X ≤ 2)
    const lambda = totalXG;
    const p0 = Math.exp(-lambda);
    const p1 = lambda * p0;
    const p2 = (lambda * lambda / 2) * p0;
    const pUnder = p0 + p1 + p2;
    
    return Number(((1 - pUnder) * 100).toFixed(1));
  }

  /**
   * Calculate both teams to score probability
   */
  calculateBTTSProbability(homeXG: number, awayXG: number): number {
    const homeCleanSheet = this.calculateCleanSheetProbability(awayXG);
    const awayCleanSheet = this.calculateCleanSheetProbability(homeXG);
    
    // BTTS = 1 - (P(home clean sheet) + P(away clean sheet) - P(both clean sheet))
    const btts = 1 - (homeCleanSheet + awayCleanSheet - (homeCleanSheet * awayCleanSheet));
    
    return Number((btts * 100).toFixed(1));
  }
}

export const xgCalculator = new XGCalculator();
