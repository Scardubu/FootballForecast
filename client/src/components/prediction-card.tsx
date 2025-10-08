import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TeamDisplay } from "@/components/team-display";
import type { Fixture, Team, Prediction } from "@shared/schema";
import { Brain, Lightbulb, Scale, Timer } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import type { APIFixture, APITeamData } from "@/lib/api-football-types";
import { MatchTeamsDisplay } from "@/components/team-display";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
    staleTime: 1000 * 60 * 15, // 15 minutes (increased to reduce reloads)
    retry: 1, // Only retry once
    refetchOnWindowFocus: false, // Prevent reload on tab switch
    refetchOnReconnect: false, // Prevent reload on network reconnect
  });

  const latency = prediction?.latencyMs ?? prediction?.serviceLatencyMs ?? null;
  const calibration = (prediction?.calibrationMetadata || undefined) as {
    method?: string;
    temperature?: number;
    applied?: boolean;
  } | undefined;
  const predictedOutcomeLabel = prediction?.predictedOutcome?.toUpperCase() ?? null;
  const calibrationTemperature = typeof calibration?.temperature === "number"
    ? calibration.temperature.toFixed(2)
    : undefined;
  const calibrationApplied = calibration?.applied ?? calibration?.applied === undefined ? true : calibration.applied;

  if (isLoading) return (
    <Card className="glass-effect animate-pulse">
      <CardContent className="px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <Skeleton className="h-6 w-48" />
          </div>
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-6 w-20 mx-auto" />
          <Skeleton className="h-6 w-20 mx-auto" />
          <Skeleton className="h-6 w-20 mx-auto" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </CardContent>
    </Card>
  );
  if (error) {
    // Render a disabled/error state for this specific card
    return (
      <Card className="glass-effect hover-lift smooth-transition animate-fade-in opacity-50">
        <CardContent className="px-6 py-8 text-center">
          <div className="text-sm text-muted-foreground">Could not load prediction.</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card key={fixture.id} className="glass-effect hover-lift smooth-transition animate-fade-in" data-testid={`prediction-card-${fixture.id}`}>
      <CardContent className="px-6 py-8">
        <div className="flex items-center justify-between mb-4">
          <MatchTeamsDisplay
            homeTeam={homeTeam || { id: 0, name: 'Home Team', logo: '', code: null, country: null, founded: null, national: null }}
            awayTeam={awayTeam || { id: 0, name: 'Away Team', logo: '', code: null, country: null, founded: null, national: null }}
            size="lg"
            showFlags={false}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground" data-testid={`prediction-date-${fixture.id}`}>
            {new Date(fixture.date).toLocaleDateString()}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-6">
          {predictedOutcomeLabel && (
            <Badge variant="secondary" className="uppercase tracking-wide text-xs" data-testid={`predicted-outcome-${fixture.id}`}>
              {predictedOutcomeLabel}
            </Badge>
          )}
          {prediction?.modelCalibrated !== undefined && (
            <Badge variant={prediction.modelCalibrated ? "outline" : "destructive"} className="text-xs">
              Calibration {prediction.modelCalibrated ? "Active" : "Bypassed"}
            </Badge>
          )}
          {prediction?.modelTrained !== undefined && (
            <Badge variant={prediction.modelTrained ? "default" : "outline"} className="text-xs">
              {prediction.modelTrained ? "Production Model" : "Fallback Model"}
            </Badge>
          )}
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
          <div className="flex items-center space-x-2">
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
                  <Brain className="h-3 w-3 text-accent" aria-hidden="true" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>ML model confidence based on data quality and feature strength</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {(latency !== null || calibration) && (
            <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
              {latency !== null && (
                <div className="flex items-center space-x-2" data-testid={`latency-${fixture.id}`}>
                  <Timer className="h-3 w-3" aria-hidden="true" />
                  <span>
                    Latency: <span className="font-medium text-foreground">{latency} ms</span>
                  </span>
                </div>
              )}
              {calibration && (
                <div className="flex items-center space-x-2" data-testid={`calibration-${fixture.id}`}>
                  <Scale className="h-3 w-3" aria-hidden="true" />
                  <span>
                    Calibration {calibrationApplied ? "applied" : "ready"}
                    {calibration.method && ` • ${calibration.method}`}
                    {calibrationTemperature && (
                      <span className="ml-1">(T={calibrationTemperature})</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          )}

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
                  <span className="text-muted-foreground">Model Version</span>
                  <span className="font-medium text-accent text-xs" data-testid={`model-version-${fixture.id}`}>
                    {prediction?.mlModel || "N/A"}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  Model provenance and configuration applied for this prediction.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="mt-4 p-3 bg-accent/10 rounded-lg border border-accent/20">
            <div className="flex items-start space-x-2">
              <Lightbulb className="h-4 w-4 text-accent mt-0.5" aria-hidden="true" />
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
