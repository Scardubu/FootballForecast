import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTelemetrySummary } from "@/hooks/use-telemetry";
import { formatCalibrationRate, formatLatency } from "@/lib/telemetry-metrics";

// Quick Stats Component (Standalone)
export function QuickStats() {
  const { metrics, loading, error } = useTelemetrySummary();

  const calibrationRate = formatCalibrationRate(metrics.calibrationRate);
  const avgLatency = metrics.totalFixtures === 0 ? 'N/A' : formatLatency(metrics.averageLatencyMs);
  const p95Latency = metrics.totalFixtures === 0 ? 'N/A' : formatLatency(metrics.p95LatencyMs);

  const totalFixturesLabel = metrics.totalFixtures > 0
    ? `${metrics.totalFixtures} active fixtures`
    : "Awaiting fixtures";

  return (
    <Card data-testid="quick-stats" className="glass-effect hover-lift smooth-transition">
      <CardContent className="px-6 py-8">
        <h3 className="text-lg font-bold text-foreground mb-4">Today's Insights</h3>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <div
                key={index}
                data-testid="skeleton"
                className="flex items-center space-x-3 p-3 rounded-lg bg-white/45 dark:bg-slate-900/40 border border-white/20 dark:border-slate-800/30"
              >
                <Skeleton className="h-6 w-6 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/55 dark:bg-slate-900/45 border border-white/20 dark:border-slate-800/35">
              <i className="fas fa-microchip text-accent" aria-hidden />
              <div>
                <div className="text-sm font-medium" data-testid="insight-fixtures">Model Coverage</div>
                <div className="text-xs text-muted-foreground">{totalFixturesLabel}</div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/55 dark:bg-slate-900/45 border border-white/20 dark:border-slate-800/35">
              <i className="fas fa-bullseye text-success" aria-hidden />
              <div>
                <div className="text-sm font-medium" data-testid="insight-calibration">Calibration Adoption</div>
                <div className="text-xs text-muted-foreground">
                  {calibrationRate} calibrated · {metrics.calibratedFixtures} ready
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3 p-3 rounded-lg bg-white/55 dark:bg-slate-900/45 border border-white/20 dark:border-slate-800/35">
              <i className="fas fa-stopwatch text-secondary" aria-hidden />
              <div>
                <div className="text-sm font-medium" data-testid="insight-latency">Latency Health</div>
                <div className="text-xs text-muted-foreground">
                  Avg {avgLatency} · P95 {p95Latency}
                </div>
              </div>
            </div>

            {error && (
              <div className="text-xs text-destructive" data-testid="insight-error">
                Telemetry offline – showing cached values
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
