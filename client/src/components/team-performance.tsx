import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import type { TeamStats, Team } from "@/lib/types";
import { useTelemetrySummary } from "@/hooks/use-telemetry";
import { formatCalibrationRate, formatLatency } from "@/lib/telemetry-metrics";
import { AlertTriangle } from "lucide-react";

export function TeamPerformance() {
  const { auth, isLoading: authLoading } = useAuth();
  
  const { data: teamStats, isLoading, error: statsError } = useQuery<TeamStats | undefined>({
    queryKey: ["/api/teams", 50, "stats"], // Manchester City example
    enabled: !authLoading, // allow public read without auth
  });

  const { data: teams, error: teamsError } = useQuery<Team[] | undefined>({
    queryKey: ["/api/teams"],
    enabled: !authLoading, // allow public read without auth
  });

  const { metrics: telemetryMetrics, loading: telemetryLoading, error: telemetryError } = useTelemetrySummary();

  const calibrationRate = formatCalibrationRate(telemetryMetrics.calibrationRate);
  const avgLatency = formatLatency(telemetryMetrics.averageLatencyMs);
  const latestUpdate = telemetryMetrics.latestUpdatedAt
    ? telemetryMetrics.latestUpdatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "Pending";
  const fallbackLabel = telemetryMetrics.uncalibratedFixtures > 0
    ? `${telemetryMetrics.uncalibratedFixtures} fallback predictions`
    : "Primary model active";

  const getTeam = (teamId: number): Team | undefined => {
    return (teams ?? []).find((team: Team) => team.id === teamId);
  };

  const getFormColor = (result: string) => {
    switch (result.toUpperCase()) {
      case 'W': return 'bg-success';
      case 'D': return 'bg-secondary';
      case 'L': return 'bg-destructive';
      default: return 'bg-muted';
    }
  };

  const error = statsError || teamsError;
  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="p-8 bg-destructive/10 rounded text-destructive text-center">
            <AlertTriangle className="mx-auto mb-2 h-10 w-10" aria-hidden="true" />
            <div className="font-semibold">Unable to load team performance</div>
            <div className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'Network error. Please try again later.'}</div>
          </div>
        </CardContent>
      </Card>
    );
  }
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
                  width={32}
                  height={32}
                  loading="lazy"
                  decoding="async"
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

          {telemetryLoading ? (
            <Skeleton className="h-8 w-full" />
          ) : (
            <div className="bg-muted/30 rounded-lg px-3 py-2 text-xs flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="uppercase tracking-wide">Calibration {calibrationRate}</Badge>
              <Badge variant={telemetryMetrics.uncalibratedFixtures > 0 ? "destructive" : "outline"}>
                {fallbackLabel}
              </Badge>
              <span className="text-muted-foreground">Latency {avgLatency}</span>
              <span className="text-muted-foreground">Updated {latestUpdate}</span>
              {telemetryError && (
                <span className="text-destructive">Telemetry degraded</span>
              )}
              {telemetryMetrics.totalFixtures === 0 && !telemetryError && (
                <span className="text-muted-foreground">Awaiting live predictions</span>
              )}
            </div>
          )}
          
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
                {(teamStats?.form || "WWWDW").split('').map((result: string, index: number) => (
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
