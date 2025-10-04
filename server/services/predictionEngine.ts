/**
 * Enhanced Prediction Engine with Betting Insights
 * Combines ML predictions with feature-based analysis for actionable betting intelligence
 */

import { featureExtractor, type MatchFeatures } from "./featureEngineering/featureExtractor.js";
import { xgCalculator } from "./featureEngineering/xgCalculator.js";
import { mlClient } from "../lib/ml-client.js";
import { logger } from "../middleware/logger.js";
import type { MLPredictionResponse } from "../../shared/schema.js";

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
  impact: number; // -1 to +1
  description: string;
  category: 'form' | 'xg' | 'h2h' | 'venue' | 'injuries' | 'market';
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
  
  // Additional markets
  additionalMarkets: {
    over25Goals: number;
    btts: number;
    bothTeamsToScore: number;
  };
}

export class PredictionEngine {
  /**
   * Generate comprehensive prediction with betting insights
   */
  async generatePrediction(fixtureId: number): Promise<EnhancedPrediction> {
    const startTime = Date.now();
    logger.info({ fixtureId }, 'Generating enhanced prediction');

    try {
      // Extract all features
      const features = await featureExtractor.extractMatchFeatures(fixtureId);
      
      // Log hybrid data usage
      const hybridSources: string[] = [];
      if (features.market) hybridSources.push('market');
      if (features.weather) hybridSources.push('weather');
      if (features.injuries.home.impactScore > 0 || features.injuries.away.impactScore > 0) {
        hybridSources.push('injuries');
      }
      
      if (hybridSources.length > 0) {
        logger.info({ fixtureId, hybridSources }, 'Using hybrid data sources for prediction');
      }
      
      // Try ML prediction first
      let mlPrediction = null;
      try {
        if (features.homeTeam && features.awayTeam) {
          mlPrediction = await mlClient.predict({
            fixture_id: fixtureId,
            home_team_id: features.homeTeam.id,
            away_team_id: features.awayTeam.id,
            home_team_name: features.homeTeam.name,
            away_team_name: features.awayTeam.name
          });
        }
      } catch (error) {
        logger.warn({ fixtureId, error }, 'ML prediction failed, using rule-based fallback');
      }

      // Generate prediction (ML or rule-based)
      const prediction = mlPrediction 
        ? this.enhanceMLPrediction(mlPrediction, features)
        : this.generateRuleBasedPrediction(features);

      const duration = Date.now() - startTime;
      logger.info({ fixtureId, duration }, 'Enhanced prediction generated');

      return prediction;
    } catch (error) {
      logger.error({ fixtureId, error }, 'Prediction generation failed');
      throw error;
    }
  }

  /**
   * Generate predictions for multiple fixtures using batch ML calls when possible
   */
  async generateBatchPredictions(fixtureIds: number[]): Promise<Map<number, EnhancedPrediction>> {
    const predictions = new Map<number, EnhancedPrediction>();
    if (fixtureIds.length === 0) {
      return predictions;
    }

    const featureResults = await Promise.allSettled(
      fixtureIds.map((fixtureId) => this.safeExtractFeatures(fixtureId))
    );

    const successfulFeatures = featureResults
      .map((result, index) => ({ result, fixtureId: fixtureIds[index] }))
      .filter((entry): entry is { result: PromiseFulfilledResult<MatchFeatures>; fixtureId: number } => entry.result.status === "fulfilled");

    const featuresByFixture = new Map<number, MatchFeatures>();
    for (const entry of successfulFeatures) {
      featuresByFixture.set(entry.fixtureId, entry.result.value);
    }

    const batchRequests = successfulFeatures
      .filter(({ result }) => result.value.homeTeam && result.value.awayTeam)
      .map(({ result, fixtureId }) => ({
        fixture_id: fixtureId,
        home_team_id: result.value.homeTeam!.id,
        away_team_id: result.value.awayTeam!.id,
        home_team_name: result.value.homeTeam!.name,
        away_team_name: result.value.awayTeam!.name,
      }));

    let batchResponses: MLPredictionResponse[] = [];
    if (batchRequests.length > 0) {
      try {
        batchResponses = await mlClient.predictBatch({ requests: batchRequests });
      } catch (error) {
        logger.warn({ error }, "Batch ML prediction request failed, falling back to individual predictions");
      }
    }

    const responseMap = new Map<number, MLPredictionResponse>();
    batchResponses.forEach((response, index) => {
      const fixtureIdFromResponse = response.fixture_id ?? batchRequests[index]?.fixture_id;
      if (fixtureIdFromResponse != null) {
        responseMap.set(fixtureIdFromResponse, response);
      }
    });

    for (const fixtureId of fixtureIds) {
      const features = featuresByFixture.get(fixtureId);
      if (!features) {
        // Extraction failed earlier; fall back to single prediction generation
        try {
          const enhanced = await this.generatePrediction(fixtureId);
          predictions.set(fixtureId, enhanced);
        } catch (error) {
          logger.warn({ fixtureId, error }, "Failed to generate prediction during batch processing");
        }
        continue;
      }

      const mlPrediction = responseMap.get(fixtureId);
      try {
        const enhanced = mlPrediction
          ? this.enhanceMLPrediction(mlPrediction, features)
          : this.generateRuleBasedPrediction(features);
        predictions.set(fixtureId, enhanced);
      } catch (error) {
        logger.warn({ fixtureId, error }, "Failed to enhance ML prediction, falling back to rule-based prediction");
        try {
          predictions.set(fixtureId, this.generateRuleBasedPrediction(features));
        } catch (fallbackError) {
          logger.error({ fixtureId, error: fallbackError }, "Failed to generate rule-based prediction during batch processing");
        }
      }
    }

    return predictions;
  }

  private async safeExtractFeatures(fixtureId: number): Promise<MatchFeatures> {
    try {
      return await featureExtractor.extractMatchFeatures(fixtureId);
    } catch (error) {
      logger.warn({ fixtureId, error }, "Feature extraction failed during batch prediction");
      throw error;
    }
  }

  /**
   * Enhance ML prediction with feature-based insights
   */
  private enhanceMLPrediction(mlPred: any, features: MatchFeatures): EnhancedPrediction {
    const topFactors = this.analyzeKeyFactors(features);
    
    // Apply market sentiment nudge before normalization
    let homeProb = mlPred.probabilities.home;
    let drawProb = mlPred.probabilities.draw;
    let awayProb = mlPred.probabilities.away;
    
    if (features.market && features.market.sentiment !== 'neutral') {
      const nudge = this.calculateMarketNudge(features.market);
      if (features.market.sentiment === 'home') {
        homeProb += nudge;
        awayProb -= nudge * 0.5;
        drawProb -= nudge * 0.5;
      } else if (features.market.sentiment === 'away') {
        awayProb += nudge;
        homeProb -= nudge * 0.5;
        drawProb -= nudge * 0.5;
      }
    }
    
    const normalized = this.normalizeToPercentages({
      home: homeProb,
      draw: drawProb,
      away: awayProb,
    });
    const suggestedBets = this.generateBettingSuggestions({
      home: normalized.home / 100,
      draw: normalized.draw / 100,
      away: normalized.away / 100,
    }, features);

    return {
      fixtureId: features.fixtureId,
      homeTeam: features.homeTeam?.name ?? 'Unknown',
      awayTeam: features.awayTeam?.name ?? 'Unknown',
      league: null,
      kickoff: new Date().toISOString(),
      
      predictions: {
        homeWin: normalized.home,
        draw: normalized.draw,
        awayWin: normalized.away,
        confidence: this.assessConfidence(mlPred.confidence, features.dataQuality.completeness)
      },
      
      insights: this.buildInsights(features),
      reasoning: {
        topFactors,
        dataQuality: features.dataQuality
      },
      suggestedBets,
      
      additionalMarkets: {
        over25Goals: Math.max(0, Math.min(100, mlPred.additional_markets?.over_2_5_goals != null
                     ? mlPred.additional_markets.over_2_5_goals * 100
                     : xgCalculator.calculateOver25Probability(features.xG.totalGoals))),
        btts: Math.max(0, Math.min(100, mlPred.additional_markets?.both_teams_score != null
              ? mlPred.additional_markets.both_teams_score * 100
              : xgCalculator.calculateBTTSProbability(features.xG.home, features.xG.away))),
        bothTeamsToScore: Math.max(0, Math.min(100, mlPred.additional_markets?.both_teams_score != null
                         ? mlPred.additional_markets.both_teams_score * 100
                         : xgCalculator.calculateBTTSProbability(features.xG.home, features.xG.away)))
      }
    };
  }

  /**
   * Generate rule-based prediction when ML unavailable
   */
  private generateRuleBasedPrediction(features: MatchFeatures): EnhancedPrediction {
    // Calculate scores for each outcome
    let homeScore = this.calculateHomeScore(features);
    let awayScore = this.calculateAwayScore(features);
    let drawScore = this.calculateDrawScore(features);
    
    // Apply market sentiment to rule-based scores
    if (features.market && features.market.sentiment !== 'neutral') {
      const marketBoost = features.market.driftVelocity * 0.15; // Scale by velocity
      if (features.market.sentiment === 'home') {
        homeScore += marketBoost;
      } else if (features.market.sentiment === 'away') {
        awayScore += marketBoost;
      }
    }

    // Apply weather modifier to expected goals
    if (features.weather && features.weather.weatherXgModifier !== null) {
      const weatherImpact = features.weather.weatherXgModifier;
      // Adverse weather typically reduces both teams' xG
      homeScore += weatherImpact * 0.5;
      awayScore += weatherImpact * 0.5;
    }

    // Convert scores to probabilities
    const totalScore = homeScore + drawScore + awayScore;
    const pcts = this.normalizeToPercentages({
      home: homeScore / totalScore,
      draw: drawScore / totalScore,
      away: awayScore / totalScore,
    });
    const probabilities = {
      homeWin: pcts.home,
      draw: pcts.draw,
      awayWin: pcts.away,
      confidence: this.assessConfidence(0.7, features.dataQuality.completeness)
    };

    const topFactors = this.analyzeKeyFactors(features);
    const suggestedBets = this.generateBettingSuggestions(
      {
        home: probabilities.homeWin / 100,
        draw: probabilities.draw / 100,
        away: probabilities.awayWin / 100
      },
      features
    );

    return {
      fixtureId: features.fixtureId,
      homeTeam: features.homeTeam?.name ?? 'Unknown',
      awayTeam: features.awayTeam?.name ?? 'Unknown',
      league: null,
      kickoff: new Date().toISOString(),
      
      predictions: probabilities,
      insights: this.buildInsights(features),
      reasoning: {
        topFactors,
        dataQuality: features.dataQuality
      },
      suggestedBets,
      
      additionalMarkets: {
        over25Goals: xgCalculator.calculateOver25Probability(features.xG.totalGoals),
        btts: xgCalculator.calculateBTTSProbability(features.xG.home, features.xG.away),
        bothTeamsToScore: xgCalculator.calculateBTTSProbability(features.xG.home, features.xG.away)
      }
    };
  }

  /**
   * Calculate home team score based on features
   */
  private calculateHomeScore(features: MatchFeatures): number {
    let score = 1.0;

    // Form contribution (40% weight)
    const formDiff = (features.form.home.last5Points - features.form.away.last5Points) / 15;
    score += formDiff * 0.4;

    // xG contribution (30% weight) with weather modifier
    let xgDiff = features.xG.differential / 3;
    if (features.weather && features.weather.weatherXgModifier !== null) {
      xgDiff += features.weather.weatherXgModifier / 3;
    }
    score += xgDiff * 0.3;

    // H2H contribution (15% weight)
    if (features.headToHead.totalMatches > 0) {
      const h2hAdv = (features.headToHead.homeWinRate - 50) / 100;
      score += h2hAdv * 0.15;
    }

    // Venue contribution (15% weight)
    const venueAdv = (features.venue.homeAdvantageScore - 5) / 10;
    score += venueAdv * 0.15;

    return Math.max(0.1, score);
  }

  /**
   * Calculate away team score
   */
  private calculateAwayScore(features: MatchFeatures): number {
    let score = 0.85; // Start lower due to away disadvantage

    // Form contribution
    const formDiff = (features.form.away.last5Points - features.form.home.last5Points) / 15;
    score += formDiff * 0.4;

    // xG contribution with weather modifier
    let xgDiff = -features.xG.differential / 3;
    if (features.weather && features.weather.weatherXgModifier !== null) {
      xgDiff += features.weather.weatherXgModifier / 3;
    }
    score += xgDiff * 0.3;

    // H2H contribution
    if (features.headToHead.totalMatches > 0) {
      const h2hAdv = (features.headToHead.awayWins / features.headToHead.totalMatches - 0.33);
      score += h2hAdv * 0.15;
    }

    return Math.max(0.1, score);
  }

  /**
   * Calculate draw probability
   */
  private calculateDrawScore(features: MatchFeatures): number {
    let score = 0.8;

    // Similar form increases draw likelihood
    const formSimilarity = 1 - Math.abs(features.form.home.last5Points - features.form.away.last5Points) / 15;
    score += formSimilarity * 0.2;

    // Low xG differential increases draw likelihood
    const xgBalance = 1 - Math.abs(features.xG.differential) / 3;
    score += xgBalance * 0.2;

    // H2H draw rate
    if (features.headToHead.totalMatches > 0) {
      const drawRate = features.headToHead.draws / features.headToHead.totalMatches;
      score += drawRate * 0.3;
    }

    return Math.max(0.1, score);
  }

  /**
   * Analyze key factors influencing the prediction
   */
  private analyzeKeyFactors(features: MatchFeatures): KeyFactor[] {
    const factors: KeyFactor[] = [];

    // Form factor
    const formImpact = (features.form.home.last5Points - features.form.away.last5Points) / 15;
    factors.push({
      factor: 'Recent Form',
      impact: Math.max(-1, Math.min(1, formImpact)),
      description: `${features.homeTeam?.name} has ${features.form.home.last5Points} points from last 5 games vs ${features.awayTeam?.name}'s ${features.form.away.last5Points} points`,
      category: 'form'
    });

    // xG factor
    const xgImpact = features.xG.differential / 3;
    factors.push({
      factor: 'Expected Goals',
      impact: Math.max(-1, Math.min(1, xgImpact)),
      description: `xG advantage of ${features.xG.differential.toFixed(2)} goals for home team`,
      category: 'xg'
    });

    // Venue factor
    const venueImpact = (features.venue.homeWinRate - 50) / 50;
    factors.push({
      factor: 'Home Advantage',
      impact: Math.max(-1, Math.min(1, venueImpact)),
      description: `${features.homeTeam?.name} wins ${features.venue.homeWinRate.toFixed(0)}% of home games`,
      category: 'venue'
    });

    // H2H factor (if available)
    if (features.headToHead.totalMatches > 0) {
      const h2hImpact = (features.headToHead.homeWinRate - 50) / 50;
      factors.push({
        factor: 'Head-to-Head Record',
        impact: Math.max(-1, Math.min(1, h2hImpact)),
        description: `${features.homeTeam?.name} won ${features.headToHead.homeWins} of ${features.headToHead.totalMatches} previous meetings`,
        category: 'h2h'
      });
    }

    // Injuries factor (surface only when meaningful)
    const homeInjuryScore = features.injuries.home.impactScore ?? 0;
    const awayInjuryScore = features.injuries.away.impactScore ?? 0;
    const homeKeyOut = features.injuries.home.keyPlayersOut ?? 0;
    const awayKeyOut = features.injuries.away.keyPlayersOut ?? 0;
    const injuryDiff = (awayInjuryScore - homeInjuryScore) / 10; // normalize -1..1 (higher away injuries favor home)
    const keyOutDiff = (awayKeyOut - homeKeyOut) / 5; // scale by up to ~5 key players
    const injuryImpact = Math.max(-1, Math.min(1, injuryDiff + keyOutDiff));
    if (Math.abs(injuryImpact) > 0.15) {
      factors.push({
        factor: 'Injury Impact',
        impact: injuryImpact,
        description: `Key players out – ${features.homeTeam?.name}: ${homeKeyOut}, ${features.awayTeam?.name}: ${awayKeyOut}`,
        category: 'injuries'
      });
    }

    // Market sentiment factor (odds drift)
    if (features.market && Math.abs(features.market.driftVelocity) > 0.08) {
      const sentiment = features.market.sentiment;
      const marketImpact = sentiment === 'home' ? features.market.driftVelocity * 2 : sentiment === 'away' ? -features.market.driftVelocity * 2 : 0;
      const direction = sentiment === 'home' ? 'towards home' : sentiment === 'away' ? 'towards away' : 'neutral';
      factors.push({
        factor: 'Market Movement',
        impact: Math.max(-1, Math.min(1, marketImpact)),
        description: `Odds shifted ${direction} (velocity: ${features.market.driftVelocity.toFixed(3)})`,
        category: 'market'
      });
    }

    // Weather factor (adverse conditions)
    if (features.weather && features.weather.weatherXgModifier !== null && Math.abs(features.weather.weatherXgModifier) > 0.1) {
      const condition = features.weather.condition || 'Unknown';
      const modifier = features.weather.weatherXgModifier;
      factors.push({
        factor: 'Weather Conditions',
        impact: modifier * 2, // Scale to -1..1 range
        description: `${condition} conditions (xG modifier: ${modifier.toFixed(2)})`,
        category: 'venue'
      });
    }

    // Sort by absolute impact
    return factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 5);
  }

  /**
   * Generate betting suggestions
   */
  private generateBettingSuggestions(
    probs: { home: number; draw: number; away: number },
    features: MatchFeatures
  ): BettingSuggestion[] {
    const suggestions: BettingSuggestion[] = [];

    // Match result suggestion
    const maxProb = Math.max(probs.home, probs.draw, probs.away);
    let outcome = 'Home Win';
    if (maxProb === probs.draw) outcome = 'Draw';
    if (maxProb === probs.away) outcome = 'Away Win';

    suggestions.push({
      type: 'match_result',
      recommendation: outcome,
      confidence: maxProb * 100,
      rationale: `Based on ${features.dataQuality.completeness}% complete data analysis`
    });

    // Over/Under 2.5 suggestion
    const over25Prob = xgCalculator.calculateOver25Probability(features.xG.totalGoals);
    suggestions.push({
      type: 'over_under',
      recommendation: over25Prob > 50 ? 'Over 2.5 Goals' : 'Under 2.5 Goals',
      confidence: Math.max(over25Prob, 100 - over25Prob),
      rationale: `Total xG of ${features.xG.totalGoals.toFixed(2)} suggests ${over25Prob > 50 ? 'high' : 'low'}-scoring match`
    });

    // BTTS suggestion
    const bttsProb = xgCalculator.calculateBTTSProbability(features.xG.home, features.xG.away);
    suggestions.push({
      type: 'both_teams_score',
      recommendation: bttsProb > 55 ? 'Yes' : 'No',
      confidence: Math.max(bttsProb, 100 - bttsProb),
      rationale: `Based on attacking/defensive metrics: Home xG ${features.xG.home}, Away xG ${features.xG.away}`
    });

    return suggestions;
  }

  /**
   * Build comprehensive insights object
   */
  private buildInsights(features: MatchFeatures): BettingInsights {
    return {
      expectedGoals: {
        home: features.xG.home,
        away: features.xG.away,
        differential: features.xG.differential
      },
      formTrend: {
        home: {
          last5Points: features.form.home.last5Points,
          goalsScored: features.form.home.goalsScored,
          goalsConceded: features.form.home.goalsConceded,
          trend: features.form.home.trend,
          formString: features.form.home.formString
        },
        away: {
          last5Points: features.form.away.last5Points,
          goalsScored: features.form.away.goalsScored,
          goalsConceded: features.form.away.goalsConceded,
          trend: features.form.away.trend,
          formString: features.form.away.formString
        }
      },
      headToHead: {
        totalMatches: features.headToHead.totalMatches,
        homeWins: features.headToHead.homeWins,
        draws: features.headToHead.draws,
        awayWins: features.headToHead.awayWins,
        lastMeetingDate: features.headToHead.lastMeetingDate,
        lastMeetingScore: features.headToHead.lastMeetingScore
      },
      injuryImpact: {
        home: features.injuries.home,
        away: features.injuries.away
      },
      venueAdvantage: {
        homeWinRate: features.venue.homeWinRate,
        averageHomeGoals: features.venue.averageHomeGoals,
        recentHomeForm: features.venue.recentHomeForm
      }
    };
  }

  /**
   * Calculate market nudge based on odds drift
   */
  private calculateMarketNudge(market: any): number {
    // Gentle nudge: max ±2% based on drift velocity
    const maxNudge = 0.02;
    const velocityFactor = Math.min(market.driftVelocity / 0.2, 1); // normalize velocity
    return maxNudge * velocityFactor;
  }

  /**
   * Assess prediction confidence level
   */
  private assessConfidence(mlConfidence: number, dataCompleteness: number): 'high' | 'medium' | 'low' {
    const combinedScore = (mlConfidence * 0.6) + (dataCompleteness / 100 * 0.4);
    
    if (combinedScore >= 0.75) return 'high';
    if (combinedScore >= 0.55) return 'medium';
    return 'low';
  }

  /**
   * Normalize probabilities to percentages that sum to 100 within ±0.1 tolerance
   */
  private normalizeToPercentages(input: { home: number; draw: number; away: number }): { home: number; draw: number; away: number } {
    // Convert any 0..1 inputs to percentages
    let home = input.home <= 1 ? input.home * 100 : input.home;
    let draw = input.draw <= 1 ? input.draw * 100 : input.draw;
    let away = input.away <= 1 ? input.away * 100 : input.away;

    // Guard against NaN/Infinity
    const safe = (v: number) => (Number.isFinite(v) && !Number.isNaN(v) ? v : 0);
    home = safe(home);
    draw = safe(draw);
    away = safe(away);

    // If all zeros, set to equal distribution
    if (home + draw + away === 0) {
      return { home: 33.4, draw: 33.3, away: 33.3 };
    }

    // Initial rounding to one decimal to stabilize UI display
    home = Math.max(0, Math.min(100, Math.round(home * 10) / 10));
    draw = Math.max(0, Math.min(100, Math.round(draw * 10) / 10));
    away = Math.max(0, Math.min(100, Math.round(away * 10) / 10));

    let total = home + draw + away;
    const diff = Math.round((100 - total) * 10) / 10; // one-decimal diff

    if (Math.abs(diff) <= 0.1) {
      // Already within tolerance
      return { home, draw, away };
    }

    // Adjust the largest component by the diff to force exact 100.0
    const components: Array<{ key: 'home' | 'draw' | 'away'; value: number }> = [
      { key: 'home', value: home },
      { key: 'draw', value: draw },
      { key: 'away', value: away },
    ];
    components.sort((a, b) => b.value - a.value);
    const largest = components[0].key;
    if (largest === 'home') home = Math.max(0, Math.min(100, Math.round((home + diff) * 10) / 10));
    if (largest === 'draw') draw = Math.max(0, Math.min(100, Math.round((draw + diff) * 10) / 10));
    if (largest === 'away') away = Math.max(0, Math.min(100, Math.round((away + diff) * 10) / 10));

    // Final clamp and sanity
    total = home + draw + away;
    if (Math.abs(100 - total) > 0.2) {
      // Distribute minor drift evenly
      const correction = Math.round(((100 - total) / 3) * 10) / 10;
      home = Math.max(0, Math.min(100, Math.round((home + correction) * 10) / 10));
      draw = Math.max(0, Math.min(100, Math.round((draw + correction) * 10) / 10));
      away = Math.max(0, Math.min(100, Math.round((away + correction) * 10) / 10));
    }
    return { home, draw, away };
  }
}

export const predictionEngine = new PredictionEngine();
