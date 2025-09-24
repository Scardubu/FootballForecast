import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MatchTeamsDisplay } from "@/components/team-display";
import { PredictionCardSkeleton } from "@/components/loading";
import type { Prediction } from "@shared/schema";
import { apiClient } from "@/lib/api-client";
import type { APIFixture, APITeamData } from "@/lib/api-football-types";

interface PredictionCardProps {
  fixture: APIFixture['fixture'];
  homeTeam?: APITeamData['team'];
  awayTeam?: APITeamData['team'];
}

export function PredictionCard({ fixture, homeTeam, awayTeam }: PredictionCardProps) {
  const { data: prediction, isLoading, error } = useQuery<Prediction>({ 
    queryKey: ["prediction", fixture.id], 
    queryFn: () => apiClient.getPredictions(fixture.id),
    enabled: !!fixture.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) return <PredictionCardSkeleton />;
  if (error) {
    // Render a disabled/error state for this specific card
    return (
      <Card className="hover-lift smooth-transition animate-fade-in opacity-50">
        <CardContent className="p-6 text-center">
          <div className="text-sm text-muted-foreground">Could not load prediction.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card key={fixture.id} className="hover-lift smooth-transition animate-fade-in" data-testid={`prediction-card-${fixture.id}`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <MatchTeamsDisplay
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            size="lg"
            showFlags={false}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground" data-testid={`prediction-date-${fixture.id}`}>
            {new Date(fixture.date).toLocaleDateString()}
          </span>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <Tooltip>
              <TooltipTrigger>
                <div className="text-2xl font-bold text-primary cursor-help" data-testid={`home-win-prob-${fixture.id}`}>
                  {prediction?.homeWinProbability || "--"}%
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Home win probability based on recent form and historical data</p>
              </TooltipContent>
            </Tooltip>
            <div className="text-sm text-muted-foreground">Home Win</div>
          </div>
          <div className="text-center">
            <Tooltip>
              <TooltipTrigger>
                <div className="text-2xl font-bold text-muted-foreground cursor-help" data-testid={`draw-prob-${fixture.id}`}>
                  {prediction?.drawProbability || "--"}%
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Draw probability considering both teams' defensive strength</p>
              </TooltipContent>
            </Tooltip>
            <div className="text-sm text-muted-foreground">Draw</div>
          </div>
          <div className="text-center">
            <Tooltip>
              <TooltipTrigger>
                <div className="text-2xl font-bold text-secondary cursor-help" data-testid={`away-win-prob-${fixture.id}`}>
                  {prediction?.awayWinProbability || "--"}%
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Away win probability factoring in away form and head-to-head</p>
              </TooltipContent>
            </Tooltip>
            <div className="text-sm text-muted-foreground">Away Win</div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">AI Confidence</span>
            <div className="flex items-center space-x-2">
              <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full prediction-confidence" 
                  style={{ width: `${prediction?.confidence || "0"}%` }}
                  data-testid={`confidence-bar-${fixture.id}`}
                ></div>
              </div>
              <span className="text-sm font-medium" data-testid={`confidence-value-${fixture.id}`}>
                {prediction?.confidence || "--"}%
              </span>
              <Tooltip>
                <TooltipTrigger>
                  <i className="fas fa-brain text-accent text-xs cursor-help"></i>
                </TooltipTrigger>
                <TooltipContent>
                  <p>ML model confidence based on data quality and feature strength</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <Tooltip>
              <TooltipTrigger>
                <div className="flex justify-between cursor-help">
                  <span className="text-muted-foreground">Expected Goals (xG)</span>
                  <span className="font-medium" data-testid={`expected-goals-${fixture.id}`}>
                    {prediction?.expectedGoalsHome || "-"} - {prediction?.expectedGoalsAway || "-"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Advanced metric: Quality of scoring chances each team is likely to create</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex justify-between cursor-help">
                  <span className="text-muted-foreground">Both Teams Score</span>
                  <span className="font-medium text-success" data-testid={`both-teams-score-${fixture.id}`}>
                    {prediction?.bothTeamsScore || "--"}%
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Probability both teams will score based on attacking/defensive patterns</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex justify-between cursor-help">
                  <span className="text-muted-foreground">Over 2.5 Goals</span>
                  <span className="font-medium text-secondary" data-testid={`over-25-goals-${fixture.id}`}>
                    {prediction?.over25Goals || "--"}%
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Likelihood of 3+ goals based on team attacking trends</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger>
                <div className="flex justify-between cursor-help">
                  <span className="text-muted-foreground">Model Version</span>
                  <span className="font-medium text-accent text-xs">
                    v1.0
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>ML model version: XGBoost with calibrated probabilities</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="mt-4 p-3 bg-accent/10 rounded-lg border border-accent/20">
            <div className="flex items-start space-x-2">
              <i className="fas fa-lightbulb text-accent mt-0.5"></i>
              <div>
                <div className="text-sm font-medium text-accent mb-1">AI Insight</div>
                <div className="text-xs text-muted-foreground leading-relaxed">
                  {prediction?.aiInsight || `The AI model predicts a ${homeTeam?.name || "home"} win based on recent form analysis, expected goals differential, and home advantage factors.`}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-border">
          <Button 
            className="w-full bg-primary text-primary-foreground hover:opacity-90"
            data-testid={`detailed-analysis-${fixture.id}`}
          >
            View Detailed Analysis
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
