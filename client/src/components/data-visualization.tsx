import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, TrendingUp, Target, BarChart3 } from "lucide-react";
import type { ScrapedData, TeamStats, Team } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";

export function DataVisualization() {
  const { auth, isLoading: authLoading } = useAuth();
  
  const { data: teamStats, isLoading: statsLoading } = useQuery<TeamStats[]>({
    queryKey: ["/api/team-stats"],
    enabled: !authLoading && !!auth?.authenticated,
  });

  const { data: teams } = useQuery<Team[]>({
    queryKey: ["/api/teams"],
    enabled: !authLoading && !!auth?.authenticated,
  });

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

  // Get top performing teams from stats
  const topTeams = teamStats?.slice(0, 2) || [];
  const getTeamName = (teamId: number) => teams?.find(t => t.id === teamId)?.name || `Team ${teamId}`;

  return (
    <section className="mt-8">
      <h2 className="text-2xl font-bold text-foreground mb-6">Performance Analytics</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Goals Trend Chart */}
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
            
            {teamStats && teamStats.length > 0 ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="p-4 bg-primary/10 rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {(teamStats.reduce((sum, stat) => sum + parseFloat(stat.averageGoalsScored || '0'), 0) / teamStats.length).toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Goals/Game</div>
                  </div>
                  <div className="p-4 bg-secondary/10 rounded-lg">
                    <div className="text-2xl font-bold text-secondary">
                      {(teamStats.reduce((sum, stat) => sum + parseFloat(stat.averageGoalsConceded || '0'), 0) / teamStats.length).toFixed(1)}
                    </div>
                    <div className="text-sm text-muted-foreground">Avg Conceded/Game</div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium">Top Performers</h4>
                  {topTeams.map((stat, index) => (
                    <div key={stat.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm font-medium">{getTeamName(stat.teamId)}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-muted-foreground">Rating:</span>
                        <span className="text-sm font-bold text-primary">{stat.overallRating || 'N/A'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mb-2" />
                  <p className="text-muted-foreground">Loading team performance data...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Team Comparison */}
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
            
            {topTeams.length >= 2 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Attack Rating</span>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{getTeamName(topTeams[0].teamId)}</span>
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${Math.min((topTeams[0].attackRating || 0) / 100 * 100, 100)}%` }}></div>
                      </div>
                      <span className="text-sm font-medium" data-testid="team1-attack">{topTeams[0].attackRating || 0}</span>
                    </div>
                    <span className="text-muted-foreground">vs</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium" data-testid="team2-attack">{topTeams[1].attackRating || 0}</span>
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-secondary" style={{ width: `${Math.min((topTeams[1].attackRating || 0) / 100 * 100, 100)}%` }}></div>
                      </div>
                      <span className="text-sm">{getTeamName(topTeams[1].teamId)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Defense Rating</span>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{getTeamName(topTeams[0].teamId)}</span>
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${Math.min((topTeams[0].defenseRating || 0) / 100 * 100, 100)}%` }}></div>
                      </div>
                      <span className="text-sm font-medium" data-testid="team1-defense">{topTeams[0].defenseRating || 0}</span>
                    </div>
                    <span className="text-muted-foreground">vs</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium" data-testid="team2-defense">{topTeams[1].defenseRating || 0}</span>
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-secondary" style={{ width: `${Math.min((topTeams[1].defenseRating || 0) / 100 * 100, 100)}%` }}></div>
                      </div>
                      <span className="text-sm">{getTeamName(topTeams[1].teamId)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Clean Sheets</span>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{getTeamName(topTeams[0].teamId)}</span>
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${Math.min((topTeams[0].cleanSheets || 0) / 10 * 100, 100)}%` }}></div>
                      </div>
                      <span className="text-sm font-medium" data-testid="team1-clean-sheets">{topTeams[0].cleanSheets || 0}</span>
                    </div>
                    <span className="text-muted-foreground">vs</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium" data-testid="team2-clean-sheets">{topTeams[1].cleanSheets || 0}</span>
                      <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-secondary" style={{ width: `${Math.min((topTeams[1].cleanSheets || 0) / 10 * 100, 100)}%` }}></div>
                      </div>
                      <span className="text-sm">{getTeamName(topTeams[1].teamId)}</span>
                    </div>
                  </div>
                </div>
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
      </div>
    </section>
  );
}
