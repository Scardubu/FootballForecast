import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth-context";
import type { TeamStats, Team } from "@/lib/types";

export function TeamPerformance() {
  const { auth, isLoading: authLoading } = useAuth();
  
  const { data: teamStats, isLoading } = useQuery({
    queryKey: ["/api/teams", 50, "stats"], // Manchester City example
    enabled: !authLoading && !!auth?.authenticated,
  });

  const { data: teams } = useQuery({
    queryKey: ["/api/teams"],
    enabled: !authLoading && !!auth?.authenticated,
  });

  const getTeam = (teamId: number): Team | undefined => {
    return teams?.find((team: Team) => team.id === teamId);
  };

  const getFormColor = (result: string) => {
    switch (result.toUpperCase()) {
      case 'W': return 'bg-success';
      case 'D': return 'bg-secondary';
      case 'L': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  if (authLoading || isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-6 w-32 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-full" />
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const team = getTeam(50); // Manchester City

  return (
    <Card data-testid="team-performance">
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Team Performance</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {team?.logo ? (
                <img 
                  src={team.logo} 
                  alt={team.name}
                  className="w-8 h-8 rounded-full object-cover"
                  data-testid="featured-team-logo"
                />
              ) : (
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">MC</span>
                </div>
              )}
              <span className="font-medium" data-testid="featured-team-name">
                {team?.name || "Manchester City"}
              </span>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <span className="text-sm font-bold text-success cursor-help" data-testid="overall-rating">
                  {teamStats?.overallRating || "94.2"}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Performance rating based on xG, defensive solidity, and form</p>
              </TooltipContent>
            </Tooltip>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Attack Rating</span>
              <span className="font-medium" data-testid="attack-rating">
                {teamStats?.attackRating || "96"}/100
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Defense Rating</span>
              <span className="font-medium" data-testid="defense-rating">
                {teamStats?.defenseRating || "92"}/100
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Form (5 games)</span>
              <div className="flex space-x-1" data-testid="team-form">
                {(teamStats?.form || "WWWDW").split('').map((result, index) => (
                  <div 
                    key={index} 
                    className={`w-4 h-4 rounded-full ${getFormColor(result)}`}
                    title={result === 'W' ? 'Win' : result === 'D' ? 'Draw' : 'Loss'}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Quick Stats Component
export function QuickStats() {
  return (
    <Card data-testid="quick-stats">
      <CardContent className="p-6">
        <h3 className="text-lg font-bold text-foreground mb-4">Today's Insights</h3>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
            <i className="fas fa-chart-line text-success"></i>
            <div>
              <div className="text-sm font-medium" data-testid="insight-scoring">High-Scoring Day</div>
              <div className="text-xs text-muted-foreground">Average of 3.2 goals per match</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
            <i className="fas fa-bullseye text-accent"></i>
            <div>
              <div className="text-sm font-medium" data-testid="insight-accuracy">Prediction Accuracy</div>
              <div className="text-xs text-muted-foreground">82% for this gameweek</div>
            </div>
          </div>
          
          <div className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
            <i className="fas fa-fire text-secondary"></i>
            <div>
              <div className="text-sm font-medium" data-testid="insight-streak">Hot Streak</div>
              <div className="text-xs text-muted-foreground">Man City: 8 wins in a row</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
