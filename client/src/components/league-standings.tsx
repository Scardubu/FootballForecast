import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamDisplay } from "@/components/team-display";
import { useLeagueStore } from "@/hooks/use-league-store";
import { useApi } from "@/hooks/use-api";
import { ErrorFallback } from "@/components/error-boundary";
import type { Standing, Team } from "@shared/schema";

export function LeagueStandings() {
  const { selectedLeague } = useLeagueStore();
  
  const { data: standings, loading: isLoadingStandings, error: standingsError } = useApi<Standing[]>(`/api/standings/${selectedLeague}`, { retry: true });
  const { data: teams, error: teamsError } = useApi<Team[]>('/api/teams', { retry: true });

  const getTeam = (teamId: number): Team | undefined => {
    return Array.isArray(teams) ? teams.find((team: Team) => team.id === teamId) : undefined;
  };

  const error = standingsError || teamsError;
  if (error) {
    return <ErrorFallback error={new Error(error)} resetError={() => window.location.reload()} />;
  }
  
  if (isLoadingStandings) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="league-standings">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">League Standings</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-accent hover:text-accent/80"
            data-testid="view-all-standings"
          >
            View All
          </Button>
        </div>
        
        <div className="space-y-3">
          {standings?.slice(0, 5).map((standing: Standing) => {
            const team = standing.teamId ? getTeam(standing.teamId) : undefined;
            
            return (
              <div 
                key={standing.id} 
                className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
                data-testid={`standing-row-${standing.teamId}`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-medium text-muted-foreground w-6" data-testid={`position-${standing.teamId}`}>
                    {standing.position}
                  </span>
                  <TeamDisplay 
                    team={team}
                    size="sm"
                    showFlag={true}
                    showName={true}
                    data-testid={`team-${standing.teamId}`}
                  />
                </div>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-muted-foreground" data-testid={`played-${standing.teamId}`}>
                    {standing.played}
                  </span>
                  <span className="font-medium" data-testid={`points-${standing.teamId}`}>
                    {standing.points}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        
        {(!standings || standings.length === 0) && (
          <div className="text-center py-8">
            <i className="fas fa-table text-4xl text-muted-foreground mb-4"></i>
            <p className="text-muted-foreground">No standings data available</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
