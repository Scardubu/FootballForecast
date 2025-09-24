import React, { useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, TrendingUp, Target, BarChart3 } from "lucide-react";
import type { ScrapedData, TeamStats, Team } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

// A component to display team performance stats in a card
const TeamPerformanceCard = React.memo(function TeamPerformanceCard({
  teamStats,
  getTeamName
}: {
  teamStats: TeamStats[];
  getTeamName: (id: number) => string;
}) {
  // Calculate averages only when data changes
  const averages = useMemo(() => {
    return {
      scored: (teamStats.reduce((sum, stat) => sum + parseFloat(stat.averageGoalsScored || '0'), 0) / teamStats.length).toFixed(1),
      conceded: (teamStats.reduce((sum, stat) => sum + parseFloat(stat.averageGoalsConceded || '0'), 0) / teamStats.length).toFixed(1)
    };
  }, [teamStats]);
  
  return (
    <Card data-testid="goals-trend-chart">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Goals Trend</h3>
          <div className="flex items-center space-x-2">
            <Tooltip>
              <TooltipTrigger>
                <i className="fas fa-info-circle text-muted-foreground cursor-help"></i>
              </TooltipTrigger>
              <TooltipContent>
                <p>Goals scored and conceded over the last 10 matches</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-4 bg-primary/10 rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {averages.scored}
              </div>
              <div className="text-sm text-muted-foreground">Avg Goals/Game</div>
            </div>
            <div className="p-4 bg-secondary/10 rounded-lg">
              <div className="text-2xl font-bold text-secondary">
                {averages.conceded}
              </div>
              <div className="text-sm text-muted-foreground">Avg Conceded/Game</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium">Top Performers</h4>
            {teamStats.slice(0, 2).map((stat) => (
              <div key={stat.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">{getTeamName(stat.teamId ?? -1)}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">Rating:</span>
                  <span className="text-sm font-bold text-primary">{stat.overallRating || 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

// A component to display team comparison stats
const TeamComparisonCard = React.memo(function TeamComparisonCard({
  teams,
  getTeamName
}: {
  teams: TeamStats[];
  getTeamName: (id: number) => string;
}) {
  // Performance metrics calculations
  const metrics = useMemo(() => {
    if (teams.length < 2) return null;
    
    return [
      {
        name: "Attack Rating",
        team1: teams[0].attackRating || 0,
        team2: teams[1].attackRating || 0,
        dataTestId1: "team1-attack",
        dataTestId2: "team2-attack",
        divisor: 100
      },
      {
        name: "Defense Rating",
        team1: teams[0].defenseRating || 0,
        team2: teams[1].defenseRating || 0,
        dataTestId1: "team1-defense",
        dataTestId2: "team2-defense",
        divisor: 100
      },
      {
        name: "Clean Sheets",
        team1: teams[0].cleanSheets || 0,
        team2: teams[1].cleanSheets || 0,
        dataTestId1: "team1-clean-sheets",
        dataTestId2: "team2-clean-sheets",
        divisor: 10
      }
    ];
  }, [teams]);

  return (
    <Card data-testid="team-comparison">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Head-to-Head Comparison</h3>
          <Select defaultValue="last5">
            <SelectTrigger className="w-32 bg-muted border border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last5">Last 5 meetings</SelectItem>
              <SelectItem value="season">This season</SelectItem>
              <SelectItem value="alltime">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {metrics ? (
          <div className="space-y-4">
            {metrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium">{metric.name}</span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">{getTeamName(teams[0]?.teamId ?? -1)}</span>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${Math.min((metric.team1) / metric.divisor * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium" data-testid={metric.dataTestId1}>{metric.team1}</span>
                  </div>
                  <span className="text-muted-foreground">vs</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium" data-testid={metric.dataTestId2}>{metric.team2}</span>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-secondary" 
                        style={{ width: `${Math.min((metric.team2) / metric.divisor * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm">{getTeamName(teams[1]?.teamId ?? -1)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-32 bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground text-sm">Loading team comparison data...</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export const DataVisualization = React.memo(function DataVisualization() {
  const { auth, isLoading: authLoading } = useAuth();
  
  const { data: teamStats, isLoading: statsLoading, error: statsError } = useQuery<TeamStats[]>({
    queryKey: ["/api/teams", "stats"],
    enabled: !authLoading,
  });

  const { data: teams, error: teamsError } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: !authLoading,
  });

  const error = statsError || teamsError;
  if (error) {
    return (
      <section className="mt-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Performance Analytics</h2>
        <div className="p-8 bg-destructive/10 rounded text-destructive text-center">
          <i className="fas fa-exclamation-triangle text-3xl mb-2"></i>
          <div className="font-semibold">Unable to load performance analytics</div>
          <div className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Network error. Please try again later.'}</div>
        </div>
      </section>
    );
  }
  if (authLoading || statsLoading) {
    return (
      <section className="mt-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Performance Analytics</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  // Memoize team lookup function to prevent unnecessary recalculations
  const getTeamName = useCallback((teamId: number) => {
    return teams?.find(t => t.id === teamId)?.name || `Team ${teamId}`;
  }, [teams]);
  
  // Memoize top teams to prevent unnecessary array operations
  const topTeams = useMemo(() => teamStats?.slice(0, 2) || [], [teamStats]);

  return (
    <section className="mt-8">
      <h2 className="text-2xl font-bold text-foreground mb-6">Performance Analytics</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {teamStats && teamStats.length > 0 ? (
          <>
            <TeamPerformanceCard teamStats={teamStats} getTeamName={getTeamName} />
            <TeamComparisonCard teams={topTeams} getTeamName={getTeamName} />
          </>
        ) : (
          [...Array(2)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-muted-foreground">Loading performance data...</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </section>
  );
});
