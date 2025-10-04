/**
 * Enhanced Match Prediction Card with Betting Insights
 */

import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { usePredictionStore, type EnhancedPrediction } from "@/hooks/use-prediction-store";
import { TrendingUp, TrendingDown, Minus, Share2, Lightbulb, ArrowUpCircle, ArrowDownCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MatchPredictionCardProps {
  fixtureId: number;
  compact?: boolean;
}

export function MatchPredictionCard({ fixtureId, compact = false }: MatchPredictionCardProps) {
  const { getPrediction, generatePrediction, isGenerating } = usePredictionStore();
  const prediction = getPrediction(fixtureId);

  if (!prediction && !isGenerating) {
    return (
      <Card className="glass-effect">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">No prediction available</p>
          <Button onClick={() => generatePrediction(fixtureId)}>
            Generate Prediction
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card className="glass-effect animate-pulse">
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            Generating betting insights...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prediction) return null;

  return (
    <TooltipProvider>
      <Card className="glass-effect hover-lift smooth-transition animate-fade-in">
        {/* Header: Teams & Kickoff */}
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="text-lg font-semibold">{prediction.homeTeam}</div>
              <Badge variant="outline" className="text-xs">VS</Badge>
              <div className="text-lg font-semibold">{prediction.awayTeam}</div>
            </div>
            <div className="text-xs text-muted-foreground">
              {new Date(prediction.kickoff).toLocaleDateString()}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Outcome Probabilities */}
          <div className="grid grid-cols-3 gap-3">
            <ProbabilityPill
              label="Home Win"
              probability={prediction.predictions.homeWin}
              color="blue"
            />
            <ProbabilityPill
              label="Draw"
              probability={prediction.predictions.draw}
              color="gray"
            />
            <ProbabilityPill
              label="Away Win"
              probability={prediction.predictions.awayWin}
              color="red"
            />
          </div>

          {/* Confidence Indicator */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Confidence</span>
            <div className="flex items-center space-x-2">
              <Badge 
                variant={
                  prediction.predictions.confidence === 'high' ? 'default' :
                  prediction.predictions.confidence === 'medium' ? 'secondary' : 'outline'
                }
                className="uppercase text-xs"
              >
                {prediction.predictions.confidence}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {prediction.reasoning.dataQuality.completeness}% complete
              </span>
            </div>
          </div>

          {/* Key Performance Indicators */}
          <Tabs defaultValue="xg" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="xg">xG</TabsTrigger>
              <TabsTrigger value="form">Form</TabsTrigger>
              <TabsTrigger value="h2h">H2H</TabsTrigger>
              <TabsTrigger value="venue">Venue</TabsTrigger>
            </TabsList>

            <TabsContent value="xg" className="mt-4 space-y-3">
              <ExpectedGoalsChart insights={prediction.insights.expectedGoals} />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <MetricDisplay 
                  label="Home xG" 
                  value={prediction.insights.expectedGoals.home.toFixed(2)} 
                />
                <MetricDisplay 
                  label="Away xG" 
                  value={prediction.insights.expectedGoals.away.toFixed(2)} 
                />
              </div>
              <div className="text-sm text-muted-foreground text-center">
                xG Differential: <span className="font-medium text-foreground">
                  {prediction.insights.expectedGoals.differential > 0 ? '+' : ''}
                  {prediction.insights.expectedGoals.differential.toFixed(2)}
                </span>
              </div>
            </TabsContent>

            <TabsContent value="form" className="mt-4 space-y-3">
              <FormTrendDisplay 
                home={prediction.insights.formTrend.home}
                away={prediction.insights.formTrend.away}
                homeTeam={prediction.homeTeam}
                awayTeam={prediction.awayTeam}
              />
            </TabsContent>

            <TabsContent value="h2h" className="mt-4 space-y-3">
              <HeadToHeadStats h2h={prediction.insights.headToHead} />
            </TabsContent>

            <TabsContent value="venue" className="mt-4 space-y-3">
              <VenueAdvantageDisplay 
                venue={prediction.insights.venueAdvantage}
                homeTeam={prediction.homeTeam}
              />
            </TabsContent>
          </Tabs>

          {/* Explainability Section */}
          <Accordion type="single" collapsible>
            <AccordionItem value="reasoning" className="border-none">
              <AccordionTrigger className="hover:no-underline py-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-accent" />
                  <span className="text-sm font-medium">Why this prediction?</span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 pt-2">
                  {prediction.reasoning.topFactors.map((factor, idx) => (
                    <FactorCard key={idx} factor={factor} />
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Suggested Bets */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Betting Suggestions
            </h4>
            <div className="space-y-2">
              {prediction.suggestedBets.map((bet, idx) => (
                <BettingSuggestionCard key={idx} bet={bet} />
              ))}
            </div>
          </div>

          {/* Additional Markets */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <MarketCard 
              label="Over 2.5 Goals" 
              probability={prediction.additionalMarkets.over25Goals}
            />
            <MarketCard 
              label="Both Teams Score" 
              probability={prediction.additionalMarkets.btts}
            />
          </div>
        </CardContent>

        <CardFooter className="text-xs text-muted-foreground flex justify-between">
          <span>{prediction.reasoning.dataQuality.recency}</span>
          <Button variant="ghost" size="sm" className="h-8">
            <Share2 className="h-3 w-3 mr-1" />
            Share
          </Button>
        </CardFooter>
      </Card>
    </TooltipProvider>
  );
}

// Sub-components
function ProbabilityPill({ label, probability, color }: { 
  label: string; 
  probability: number; 
  color: 'blue' | 'gray' | 'red' 
}) {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    gray: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
    red: 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
  };

  return (
    <div className={cn(
      "flex flex-col items-center p-3 rounded-lg border",
      colorClasses[color]
    )}>
      <div className="text-2xl font-bold">{probability.toFixed(1)}%</div>
      <div className="text-xs mt-1">{label}</div>
    </div>
  );
}

function ExpectedGoalsChart({ insights }: { insights: { home: number; away: number; differential: number } }) {
  const maxXG = Math.max(insights.home, insights.away, 3);
  const homeWidth = (insights.home / maxXG) * 100;
  const awayWidth = (insights.away / maxXG) * 100;

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>Home</span>
          <span className="font-medium">{insights.home.toFixed(2)}</span>
        </div>
        <Progress value={homeWidth} className="h-2" />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span>Away</span>
          <span className="font-medium">{insights.away.toFixed(2)}</span>
        </div>
        <Progress value={awayWidth} className="h-2" />
      </div>
    </div>
  );
}

function FormTrendDisplay({ home, away, homeTeam, awayTeam }: any) {
  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{homeTeam}</span>
          {getTrendIcon(home.trend)}
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <MetricDisplay label="Points" value={home.last5Points} />
          <MetricDisplay label="Scored" value={home.goalsScored} />
          <MetricDisplay label="Conceded" value={home.goalsConceded} />
        </div>
        <div className="text-xs text-center">
          Form: <span className="font-mono font-medium">{home.formString}</span>
        </div>
      </div>
      
      <div className="border-t pt-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{awayTeam}</span>
          {getTrendIcon(away.trend)}
        </div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <MetricDisplay label="Points" value={away.last5Points} />
          <MetricDisplay label="Scored" value={away.goalsScored} />
          <MetricDisplay label="Conceded" value={away.goalsConceded} />
        </div>
        <div className="text-xs text-center">
          Form: <span className="font-mono font-medium">{away.formString}</span>
        </div>
      </div>
    </div>
  );
}

function HeadToHeadStats({ h2h }: any) {
  if (h2h.totalMatches === 0) {
    return (
      <div className="text-center text-sm text-muted-foreground py-4">
        No previous meetings recorded
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <MetricDisplay label="Home Wins" value={h2h.homeWins} />
        <MetricDisplay label="Draws" value={h2h.draws} />
        <MetricDisplay label="Away Wins" value={h2h.awayWins} />
      </div>
      <div className="text-xs text-muted-foreground space-y-1">
        <div>Total Matches: {h2h.totalMatches}</div>
        {h2h.lastMeetingDate && (
          <div>Last Meeting: {h2h.lastMeetingDate} ({h2h.lastMeetingScore})</div>
        )}
      </div>
    </div>
  );
}

function VenueAdvantageDisplay({ venue, homeTeam }: any) {
  return (
    <div className="space-y-3">
      <MetricDisplay 
        label="Home Win Rate" 
        value={`${venue.homeWinRate.toFixed(0)}%`} 
      />
      <MetricDisplay 
        label="Avg Home Goals" 
        value={venue.averageHomeGoals.toFixed(1)} 
      />
      <div className="text-xs text-center">
        Recent Home Form: <span className="font-mono font-medium">{venue.recentHomeForm}</span>
      </div>
    </div>
  );
}

function FactorCard({ factor }: any) {
  const getImpactColor = (impact: number) => {
    if (impact > 0.3) return 'text-green-600 dark:text-green-400';
    if (impact < -0.3) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getImpactIcon = (impact: number) => {
    if (impact > 0.3) return <ArrowUpCircle className="h-4 w-4" />;
    if (impact < -0.3) return <ArrowDownCircle className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  return (
    <div className="flex items-start space-x-3 p-3 bg-muted/40 rounded-lg">
      <div className={cn("mt-0.5", getImpactColor(factor.impact))}>
        {getImpactIcon(factor.impact)}
      </div>
      <div className="flex-1 space-y-1">
        <div className="text-sm font-medium">{factor.factor}</div>
        <div className="text-xs text-muted-foreground">{factor.description}</div>
      </div>
      <Badge variant="outline" className="text-xs">
        {factor.category}
      </Badge>
    </div>
  );
}

function BettingSuggestionCard({ bet }: any) {
  return (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{bet.recommendation}</span>
        <Badge variant="secondary" className="text-xs">
          {bet.confidence.toFixed(0)}%
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{bet.rationale}</p>
    </div>
  );
}

function MarketCard({ label, probability }: { label: string; probability: number }) {
  return (
    <div className="p-3 border rounded-lg space-y-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold">{probability.toFixed(1)}%</div>
    </div>
  );
}

function MetricDisplay({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-2 bg-muted/40 rounded">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-medium mt-1">{value}</div>
    </div>
  );
}
