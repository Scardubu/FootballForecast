import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { PredictionCardSkeleton } from "@/components/loading";
import { Grid } from "@/components/layout/grid";
import type { Team } from "@shared/schema";
import { apiClient, type APIFootballResponse } from "@/lib/api-client";
import type { APIFixture, APITeamData } from "@/lib/api-football-types";
import { PredictionCard } from "@/components/prediction-card";

export function PredictionsPanel() {
  const { auth, isLoading: authLoading } = useAuth();

  const { data: fixturesResponse, isLoading: fixturesLoading, error: fixturesError } = useQuery<APIFootballResponse<APIFixture[]>>({
    queryKey: ["fixtures", { upcoming: true }],
    queryFn: () => apiClient.getFixtures(),
    enabled: !authLoading,
  });

  const fixtures = fixturesResponse?.response
    .filter(f => f.fixture.status.short === "NS" || f.fixture.status.short === "TBD")
    .slice(0, 3);

  const { data: teamsResponse, error: teamsError } = useQuery<APIFootballResponse<APITeamData[]>>({
    queryKey: ["teams"],
    queryFn: () => apiClient.getTeams(),
    enabled: !authLoading,
  });

  const teams = teamsResponse?.response;
  const getTeam = (teamId: number): APITeamData['team'] | undefined => {
    return teams?.find((t) => t.team.id === teamId)?.team;
  };

  const error = fixturesError || teamsError;
  if (error) {
    return (
      <div className="animate-fade-in">
        <div className="p-8 bg-destructive/10 rounded text-destructive text-center">
          <i className="fas fa-exclamation-triangle text-3xl mb-2"></i>
          <div className="font-semibold">Unable to load predictions</div>
          <div className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Network error. Please try again later.'}</div>
        </div>
      </div>
    );
  }
  if (authLoading || fixturesLoading) {
    return (
      <div className="animate-fade-in">
        <Grid cols={{ base: 1 }} gap={6}>
          {[...Array(2)].map((_, i) => (
            <PredictionCardSkeleton key={i} />
          ))}
        </Grid>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div>
        <div className="flex items-center space-x-2 mb-6">
          <Tooltip>
            <TooltipTrigger>
              <i className="fas fa-info-circle text-muted-foreground cursor-help" data-testid="predictions-info"></i>
            </TooltipTrigger>
            <TooltipContent>
              <p>Predictions based on team form, head-to-head stats, and advanced analytics</p>
            </TooltipContent>
          </Tooltip>
          <span className="text-sm text-muted-foreground">AI-Powered</span>
        </div>
        
        <Grid cols={{ base: 1 }} gap={6}>
          <>
            {fixtures?.map((fixtureData) => {
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
                  <i className="fas fa-crystal-ball text-4xl text-muted-foreground mb-4"></i>
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
