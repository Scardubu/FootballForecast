/**
 * Betting Insights Page - Complete betting intelligence platform
 */

import { useState } from "react";
import { usePredictionStore } from "@/hooks/use-prediction-store";
import { BettingInsightsSelector } from "@/components/betting-insights-selector";
import { MatchPredictionCard } from "@/components/match-prediction-card";
import { Card, CardContent } from "@/components/ui/card";
import { Section } from "@/components/layout/section";
import { Grid } from "@/components/layout/grid";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, Target, BarChart3, Sparkles } from "lucide-react";

export default function BettingInsights() {
  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null);
  const { getPrediction, predictions } = usePredictionStore();
  
  const selectedPrediction = selectedFixtureId ? getPrediction(selectedFixtureId) : null;
  const recentPredictions = Array.from(predictions.values()).slice(0, 3);

  return (
    <div className="space-y-8 pb-24">
      {/* Hero Section */}
      <Section 
        title="Betting Insights" 
        description="AI-powered match predictions with comprehensive betting intelligence"
      >
        <Card className="glass-effect border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold">Advanced Prediction Engine</h3>
                </div>
                <p className="text-sm text-muted-foreground max-w-2xl">
                  Get actionable betting insights powered by xG analysis, form trends, head-to-head records, 
                  and venue statistics. Our hybrid ML + rule-based system delivers calibrated probabilities 
                  with full explainability.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Badge variant="default" className="w-fit">
                  <Target className="h-3 w-3 mr-1" />
                  ML-Enhanced
                </Badge>
                <Badge variant="secondary" className="w-fit">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  6 Leagues
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* Main Content */}
      <Grid cols={{ base: 1, lg: 2 }} gap={8}>
        {/* Left Column: Fixture Selector */}
        <div className="space-y-6">
          <BettingInsightsSelector 
            onFixtureSelect={(id) => setSelectedFixtureId(id)} 
          />

          {/* Recent Predictions */}
          {recentPredictions.length > 0 && (
            <Section 
              title="Recent Predictions" 
              description="Your latest betting insights"
            >
              <div className="space-y-3">
                {recentPredictions.map(prediction => (
                  <Card 
                    key={prediction.fixtureId}
                    className="glass-effect hover:border-primary/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedFixtureId(prediction.fixtureId)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="text-sm font-medium">
                            {prediction.homeTeam} vs {prediction.awayTeam}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Confidence: {prediction.predictions.confidence}
                          </div>
                        </div>
                        <Badge variant="outline">
                          {Math.max(
                            prediction.predictions.homeWin,
                            prediction.predictions.draw,
                            prediction.predictions.awayWin
                          ).toFixed(0)}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Right Column: Detailed Prediction */}
        <div className="space-y-6">
          {selectedFixtureId ? (
            <>
              <Section 
                title="Detailed Analysis" 
                description="Comprehensive betting intelligence for selected match"
              >
                <MatchPredictionCard fixtureId={selectedFixtureId} />
              </Section>

              {/* Quick Actions */}
              <Card className="glass-effect">
                <CardContent className="p-4">
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" size="sm">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Compare Odds
                    </Button>
                    <Button variant="outline" className="flex-1" size="sm">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Track Match
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="glass-effect">
              <CardContent className="flex flex-col items-center justify-center py-16 px-6">
                <div className="text-center space-y-4">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Select a Match</h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Choose a fixture from the selector to generate detailed betting insights 
                      with AI-powered predictions and comprehensive analysis.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Grid>

      {/* Features Overview */}
      <Section 
        title="What You Get" 
        description="Comprehensive betting intelligence features"
      >
        <Grid cols={{ base: 1, md: 2, lg: 4 }} gap={4}>
          <FeatureCard
            icon={<TrendingUp className="h-5 w-5" />}
            title="Match Probabilities"
            description="Calibrated win/draw/loss percentages with confidence levels"
          />
          <FeatureCard
            icon={<BarChart3 className="h-5 w-5" />}
            title="xG Analysis"
            description="Expected goals metrics with offensive/defensive breakdowns"
          />
          <FeatureCard
            icon={<Target className="h-5 w-5" />}
            title="Form Trends"
            description="Recent performance analysis with momentum indicators"
          />
          <FeatureCard
            icon={<Sparkles className="h-5 w-5" />}
            title="Betting Suggestions"
            description="Actionable recommendations for various betting markets"
          />
        </Grid>
      </Section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <Card className="glass-effect">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2 text-primary">
          {icon}
          <h4 className="font-semibold text-sm">{title}</h4>
        </div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
