import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TeamDisplay } from "@/components/team-display";
import { useWebSocket } from "@/hooks/use-websocket";
import { ErrorBoundary, ErrorFallback } from "@/components/error-boundary";
import { MatchCardSkeleton, SkeletonGrid } from "@/components/loading";
import { Grid } from "@/components/layout/grid";
import { useApi } from "@/hooks/use-api";
import type { Fixture, Team } from "@shared/schema";

export function LiveMatches() {
  // Use WebSocket for real-time updates with HTTP fallback
  const { isConnected: wsConnected, isConnecting: wsConnecting, connectionStats } = useWebSocket({
    onMessage: (message) => {
      if (message.type === 'fixture_update') {
        console.log('🔄 Real-time fixture update received');
      }
    }
  });
  
  const { data: liveFixtures, loading: isLoading, error, refetch } = useApi<Fixture[]>('/api/fixtures/live', { retry: true });
  const { data: teams } = useApi<Team[]>('/api/teams', { retry: true });
  
  // Auto-refresh every 15 seconds if not connected via WebSocket
  React.useEffect(() => {
    if (!wsConnected) {
      const interval = setInterval(refetch, 15000);
      return () => clearInterval(interval);
    }
  }, [wsConnected, refetch]);

  const getTeam = (teamId: number): Team | undefined => {
    return teams?.find((team: Team) => team.id === teamId);
  };

  const getStatusDisplay = (status: string, elapsed: number | null) => {
    switch (status) {
      case "LIVE":
      case "1H":
      case "2H":
        return { text: `LIVE ${elapsed}'`, color: "text-success", pulse: true };
      case "HT":
        return { text: "HALF TIME", color: "text-secondary", pulse: true };
      case "FT":
        return { text: "FULL TIME", color: "text-muted-foreground", pulse: false };
      default:
        return { text: status, color: "text-muted-foreground", pulse: false };
    }
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <SkeletonGrid count={3} component={MatchCardSkeleton} />
      </div>
    );
  }

  if (error) {
    return <ErrorFallback error={new Error(error)} resetError={refetch} />;
  }

  return (
    <ErrorBoundary>
      <div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
          {wsConnecting ? (
            <>
              <i className="fas fa-spinner fa-spin text-info"></i>
              <span>Connecting to real-time updates...</span>
            </>
          ) : wsConnected ? (
            <>
              <i className="fas fa-wifi text-success"></i>
              <span>Real-time updates • {connectionStats.messagesReceived} received</span>
              <div className="w-2 h-2 bg-success rounded-full live-pulse"></div>
            </>
          ) : (
            <>
              <i className="fas fa-clock text-warning"></i>
              <span>Updates every 15 seconds</span>
            </>
          )}
        </div>
      
        <Grid cols={{ base: 1, md: 2, lg: 3 }} gap={6}>
        {liveFixtures?.map((fixture: Fixture) => {
          const homeTeam = fixture.homeTeamId ? getTeam(fixture.homeTeamId) : undefined;
          const awayTeam = fixture.awayTeamId ? getTeam(fixture.awayTeamId) : undefined;
          const status = getStatusDisplay(fixture.status, fixture.elapsed);
          
          return (
            <Card key={fixture.id} className="hover-lift smooth-transition animate-fade-in" data-testid={`match-card-${fixture.id}`}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    {status.pulse && <div className="w-2 h-2 bg-success rounded-full live-pulse"></div>}
                    <span className={`text-sm font-medium ${status.color}`} data-testid={`match-status-${fixture.id}`}>
                      {status.text}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">{fixture.round}</span>
                </div>
                
                <div className="space-y-4">
                  {/* Home Team */}
                  <div className="flex items-center justify-between">
                    <TeamDisplay 
                      team={homeTeam} 
                      size="md"
                      showName={true}
                      showFlag={false}
                      data-testid={`home-team-${fixture.id}`}
                    />
                    <span className="text-2xl font-bold text-primary" data-testid={`home-score-${fixture.id}`}>
                      {fixture.homeScore ?? "-"}
                    </span>
                  </div>
                  
                  {/* Away Team */}
                  <div className="flex items-center justify-between">
                    <TeamDisplay 
                      team={awayTeam} 
                      size="md"
                      showName={true}
                      showFlag={false}
                      data-testid={`away-team-${fixture.id}`}
                    />
                    <span className="text-2xl font-bold text-primary" data-testid={`away-score-${fixture.id}`}>
                      {fixture.awayScore ?? "-"}
                    </span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground" data-testid={`venue-${fixture.id}`}>
                      {fixture.venue || "Stadium TBD"}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-accent hover:text-accent/80"
                      data-testid={`view-details-${fixture.id}`}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {(!liveFixtures || liveFixtures.length === 0) && (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <i className="fas fa-calendar-times text-4xl text-muted-foreground mb-4"></i>
              <h3 className="text-lg font-semibold text-foreground mb-2">No Live Matches</h3>
              <p className="text-muted-foreground">Check back later for live football action!</p>
            </CardContent>
          </Card>
        )}
        </Grid>
      </div>
    </ErrorBoundary>
  );
}
