import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { TeamDisplay } from "@/components/team-display";
import type { Fixture, Team } from "@shared/schema";

export function LiveMatches() {
  const { auth, isLoading: authLoading } = useAuth();
  
  const { data: liveFixtures, isLoading } = useQuery<Fixture[]>({
    queryKey: ["/api/fixtures/live"],
    refetchInterval: 15000, // Refetch every 15 seconds
    enabled: !authLoading && !!auth?.authenticated,
  });

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: !authLoading && !!auth?.authenticated,
  });

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

  if (authLoading || isLoading) {
    return (
      <section className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">Live Matches</h2>
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-foreground">Live Matches</h2>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <i className="fas fa-clock"></i>
          <span>Updates every 15 seconds</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {liveFixtures?.map((fixture: Fixture) => {
          const homeTeam = fixture.homeTeamId ? getTeam(fixture.homeTeamId) : undefined;
          const awayTeam = fixture.awayTeamId ? getTeam(fixture.awayTeamId) : undefined;
          const status = getStatusDisplay(fixture.status, fixture.elapsed);
          
          return (
            <Card key={fixture.id} className="hover:shadow-lg transition-shadow" data-testid={`match-card-${fixture.id}`}>
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
      </div>
    </section>
  );
}
