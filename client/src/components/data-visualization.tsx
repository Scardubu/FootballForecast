import React, { useMemo, useCallback } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, TrendingUp, Target, BarChart3 } from "lucide-react";
import type { ScrapedData, TeamStats, Team } from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { useTelemetrySummary } from "@/hooks/use-telemetry";
import type { TelemetryMetrics } from "@/lib/telemetry-metrics";
import { formatCalibrationRate, formatLatency } from "@/lib/telemetry-metrics";

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
    if (!Array.isArray(teamStats) || teamStats.length === 0) {
      return {
        scored: '0.0',
        conceded: '0.0'
      };
    }
    
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
            {Array.isArray(teamStats) && teamStats.length > 0 && teamStats.slice(0, 2).map((stat) => (
              <div key={stat.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">{getTeamName(stat.teamId ?? -1)}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">Rating:</span>
                  <span className="text-sm font-bold text-primary">{stat.overallRating || 'N/A'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Overall Ratings Chart for Top 5 Teams */}
          {Array.isArray(teamStats) && teamStats.length > 0 && (
            <div className="h-64 bg-background rounded-lg border border-border p-3">
              <h4 className="font-medium mb-2">Overall Rating (Top 5)</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={teamStats.slice(0, 5).map((s) => ({
                    name: getTeamName(s.teamId ?? -1),
                    rating: Number(s.overallRating ?? 0)
                  }))}
                  margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={36} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} domain={[0, 100]} />
                  <RechartsTooltip contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} cursor={{ fill: 'hsl(var(--muted))' }} />
                  <Bar dataKey="rating" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

const TelemetrySummaryCard = React.memo(function TelemetrySummaryCard({
  metrics,
  loading,
  error,
}: {
  metrics: TelemetryMetrics;
  loading: boolean;
  error: Error | null;
}) {
  const calibrationRate = formatCalibrationRate(metrics.calibrationRate);
  const avgLatency = formatLatency(metrics.averageLatencyMs);
  const p95Latency = formatLatency(metrics.p95LatencyMs);
  const maxLatency = formatLatency(metrics.maxLatencyMs);

  return (
    <Card className="xl:col-span-2" data-testid="telemetry-summary-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-foreground">Model Telemetry</h3>
          {error && <span className="text-xs text-destructive">Degraded</span>}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="p-4 bg-muted/40 rounded-lg">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Fixtures Covered</div>
              <div className="text-2xl font-semibold">{metrics.totalFixtures}</div>
              <div className="text-xs text-muted-foreground">Calibrated {metrics.calibratedFixtures}</div>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Calibration Rate</div>
              <div className="text-2xl font-semibold">{calibrationRate}</div>
              <div className="text-xs text-muted-foreground">Fallback {metrics.uncalibratedFixtures}</div>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Avg Latency</div>
              <div className="text-2xl font-semibold">{avgLatency}</div>
              <div className="text-xs text-muted-foreground">P95 {p95Latency}</div>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground mb-1">Peak Observed</div>
              <div className="text-2xl font-semibold">{maxLatency}</div>
              <div className="text-xs text-muted-foreground">Service Avg {formatLatency(metrics.serviceLatencyAverageMs)}</div>
            </div>
          </div>
        )}
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
    if (!Array.isArray(teams) || teams.length < 2) return null;
    
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
            {Array.isArray(metrics) && metrics.map((metric, index) => (
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
          <div className="space-y-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-muted rounded"></div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-16 bg-muted rounded"></div>
                  <div className="w-16 h-2 bg-muted/50 rounded-full"></div>
                  <div className="h-4 w-8 bg-muted rounded"></div>
                </div>
                <div className="h-4 w-4 bg-muted rounded"></div>
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-8 bg-muted rounded"></div>
                  <div className="w-16 h-2 bg-muted/50 rounded-full"></div>
                  <div className="h-4 w-16 bg-muted rounded"></div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="h-4 w-24 bg-muted rounded"></div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-16 bg-muted rounded"></div>
                  <div className="w-16 h-2 bg-muted/50 rounded-full"></div>
                  <div className="h-4 w-8 bg-muted rounded"></div>
                </div>
                <div className="h-4 w-4 bg-muted rounded"></div>
                <div className="flex items-center space-x-2">
                  <div className="h-4 w-8 bg-muted rounded"></div>
                  <div className="w-16 h-2 bg-muted/50 rounded-full"></div>
                  <div className="h-4 w-16 bg-muted rounded"></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export const DataVisualization = React.memo(function DataVisualization() {
  const { auth, isLoading: authLoading } = useAuth();
  const { metrics: telemetryMetrics, loading: telemetryLoading, error: telemetryError } = useTelemetrySummary();
  
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
          {/* Performance Card Skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-8" />
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/5 rounded-lg animate-pulse">
                    <Skeleton className="h-8 w-16 mx-auto mb-2" />
                    <Skeleton className="h-4 w-24 mx-auto" />
                  </div>
                  <div className="p-4 bg-muted/5 rounded-lg animate-pulse">
                    <Skeleton className="h-8 w-16 mx-auto mb-2" />
                    <Skeleton className="h-4 w-24 mx-auto" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-5 w-28" />
                  <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg">
                    <Skeleton className="h-4 w-24" />
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/10 rounded-lg">
                    <Skeleton className="h-4 w-24" />
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-3 w-12" />
                      <Skeleton className="h-4 w-8" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Comparison Card Skeleton */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-8 w-32 rounded-md" />
              </div>
              <div className="space-y-4 animate-pulse">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-16" />
                      <div className="w-16 h-2 bg-muted/50 rounded-full">
                        <div className="h-full bg-primary/30 rounded-full" style={{ width: '50%' }} />
                      </div>
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <Skeleton className="h-4 w-4" />
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-8" />
                      <div className="w-16 h-2 bg-muted/50 rounded-full">
                        <div className="h-full bg-secondary/30 rounded-full" style={{ width: '70%' }} />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-16" />
                      <div className="w-16 h-2 bg-muted/50 rounded-full">
                        <div className="h-full bg-primary/30 rounded-full" style={{ width: '65%' }} />
                      </div>
                      <Skeleton className="h-4 w-8" />
                    </div>
                    <Skeleton className="h-4 w-4" />
                    <div className="flex items-center space-x-2">
                      <Skeleton className="h-4 w-8" />
                      <div className="w-16 h-2 bg-muted/50 rounded-full">
                        <div className="h-full bg-secondary/30 rounded-full" style={{ width: '45%' }} />
                      </div>
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    );
  }

  // Memoize team lookup function to prevent unnecessary recalculations
  const getTeamName = useCallback((teamId: number) => {
    return teams?.find(t => t.id === teamId)?.name || `Team ${teamId}`;
  }, [teams]);
  
  // Memoize top teams to prevent unnecessary array operations
  const topTeams = useMemo(() => {
    return Array.isArray(teamStats) ? teamStats.slice(0, 2) : [];
  }, [teamStats]);

  const renderSkeletonCard = (key: string) => (
    <Card key={key}>
      <CardContent className="p-6">
        <div className="animate-pulse space-y-4">
          <Skeleton className="h-6 w-28" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <section className="mt-8">
      <h2 className="text-2xl font-bold text-foreground mb-6">Performance Analytics</h2>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <TelemetrySummaryCard metrics={telemetryMetrics} loading={telemetryLoading} error={telemetryError} />

        {teamStats && teamStats.length > 0 ? (
          <TeamPerformanceCard teamStats={teamStats} getTeamName={getTeamName} />
        ) : (
          renderSkeletonCard("team-performance-skeleton")
        )}

        {topTeams.length >= 2 ? (
          <TeamComparisonCard teams={topTeams} getTeamName={getTeamName} />
        ) : (
          renderSkeletonCard("team-comparison-skeleton")
        )}
      </div>
    </section>
  );
});
