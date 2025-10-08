import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth-context";
import { PredictionCard } from "@/components/prediction-card";
import { OfflineIndicator } from "@/components/offline-indicator";
import type { Fixture } from "@shared/schema";
import { Info, Sparkles } from "lucide-react";
import { Grid } from "@/components/layout/grid";
import { useApi } from "@/hooks/use-api";
import { useLeagueStore } from "@/hooks/use-league-store";
import type { Prediction } from "@shared/schema";
import type { APIFixture, APITeamData } from "@/lib/api-football-types";
import { Badge } from "@/components/ui/badge";
import { useMemo } from "react";
import { ErrorBoundary, ErrorFallback } from "@/components/error-boundary";

interface FixtureResponse {
  response: APIFixture[];
}

interface TeamsResponse {
  response: APITeamData[];
}

export function PredictionsPanel() {
  const { selectedLeague, selectedSeason } = useLeagueStore();

  const { data: fixturesData, loading: fixturesLoading, error: fixturesError, refetch: refetchFixtures } = 
    useApi<FixtureResponse>(
      `/api/football/fixtures?league=${selectedLeague}&season=${selectedSeason}`, 
      { retry: false, enableCache: true, maxRetries: 1 }
    );
    
  const { data: teamsData, error: teamsError } = 
    useApi<TeamsResponse>("/api/football/teams", { retry: false, enableCache: true, maxRetries: 1 });

  // Extract the fixtures and filter for upcoming matches
  const fixtures = fixturesData?.response
    ?.filter(f => f.fixture.status.short === "NS" || f.fixture.status.short === "TBD")
    ?.slice(0, 3);

  // Calculate telemetry endpoint BEFORE using it in hook
  const fixtureIdsParam = Array.isArray(fixtures) && fixtures.length > 0
    ? fixtures.map((fixtureData) => fixtureData.fixture.id).join(",")
    : undefined;
  const telemetryEndpoint = fixtureIdsParam
    ? `/api/predictions/telemetry?fixtureIds=${fixtureIdsParam}`
    : '/api/predictions/telemetry';

  // FIXED: Always call useApi hook unconditionally
  const { data: predictionsTelemetry } = useApi<Record<number, Prediction | undefined>>(telemetryEndpoint, {
    retry: false,
    enableCache: true,
    disabled: !fixtureIdsParam, // Use disabled option instead of conditional hook
    maxRetries: 1,
  });

  // Get team data helper function
  const getTeam = (teamId: number): APITeamData['team'] | undefined => {
    return teamsData?.response?.find((t) => t.team.id === teamId)?.team;
  };

  // FIXED: Calculate telemetry summary BEFORE any early returns (Rules of Hooks)
  const telemetrySummary = useMemo(() => {
    if (!Array.isArray(fixtures) || !predictionsTelemetry) {
      return null;
    }

    const selectedTelemetry = fixtures
      .map(fixtureData => predictionsTelemetry[fixtureData.fixture.id])
      .filter((pred): pred is Prediction => Boolean(pred));

    if (selectedTelemetry.length === 0) {
      return null;
    }

    const latencyValues = selectedTelemetry
      .map(pred => pred.latencyMs ?? pred.serviceLatencyMs)
      .filter((value): value is number => typeof value === 'number');
    const averageLatency = latencyValues.length > 0
      ? Math.round(latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length)
      : null;

    const calibratedCount = selectedTelemetry.filter(pred => pred.modelCalibrated).length;
    const fallbackCount = selectedTelemetry.filter(pred => pred.modelTrained === false).length;

    return {
      fixturesCount: selectedTelemetry.length,
      averageLatency,
      calibratedCount,
      fallbackCount,
    };
  }, [fixtures, predictionsTelemetry]);

  // Error handling - AFTER all hooks
  const error = fixturesError || teamsError;
  if (error) {
    return <ErrorFallback error={new Error(error)} resetError={refetchFixtures} />;
  }

  // Loading state - AFTER all hooks
  if (fixturesLoading) {
    return (
      <div className="animate-fade-in">
        <Grid cols={{ base: 1 }} gap={6}>
          {[...Array(2)].map((_, i) => (
            <Card key={i} className="glass-effect animate-pulse">
              <CardContent className="p-6 space-y-4">
                <div className="flex justify-between">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <Skeleton className="h-6" />
                  <Skeleton className="h-6" />
                  <Skeleton className="h-6" />
                </div>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </Grid>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="cv-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" aria-hidden="true" data-testid="predictions-info" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Predictions based on team form, head-to-head stats, and advanced analytics</p>
              </TooltipContent>
            </Tooltip>
            <span className="text-sm text-muted-foreground">AI-Powered</span>
          </div>
          <OfflineIndicator variant="subtle" />
        </div>

        {telemetrySummary && (
          <div className="flex flex-wrap items-center gap-2 mb-4 text-xs">
            <Badge variant="secondary">
              Fixtures analyzed: {telemetrySummary.fixturesCount}
            </Badge>
            <Badge variant="outline">
              Calibration ready: {telemetrySummary.calibratedCount}/{telemetrySummary.fixturesCount}
            </Badge>
            <Badge variant={telemetrySummary.fallbackCount > 0 ? "destructive" : "default"}>
              {telemetrySummary.fallbackCount > 0 ? `${telemetrySummary.fallbackCount} fallback` : "Primary model"}
            </Badge>
            {telemetrySummary.averageLatency !== null && (
              <Badge variant="outline">Avg latency: {telemetrySummary.averageLatency} ms</Badge>
            )}
          </div>
        )}
        
        <Grid cols={{ base: 1 }} gap={6}>
          <>
            {Array.isArray(fixtures) && fixtures.map((fixtureData) => {
              const { fixture, teams: fixtureTeams } = fixtureData;
              const homeTeam = getTeam(fixtureTeams.home.id);
              const awayTeam = getTeam(fixtureTeams.away.id);

              return (
                <PredictionCard 
                  key={fixture.id} 
                  fixture={fixture} 
                  homeTeam={homeTeam} 
                  awayTeam={awayTeam} 
                />
              );
            })}

            {(!fixtures || fixtures.length === 0) && (
              <Card>
                <CardContent className="p-8 text-center">
                  <Sparkles className="mx-auto mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Predictions Available</h3>
                  <p className="text-muted-foreground">Predictions will appear when upcoming matches are scheduled.</p>
                </CardContent>
              </Card>
            )}
          </>
        </Grid>
      </div>
    </ErrorBoundary>
  );
}
