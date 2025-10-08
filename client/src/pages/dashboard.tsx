import { useMemo, useState } from "react";
import { useLeagueStore } from "@/hooks/use-league-store";
import { useApi } from "@/hooks/use-api";
import { useTelemetrySummary } from "@/hooks/use-telemetry";
import { useIngestionSummary } from "@/hooks/use-ingestion-summary";
import { formatLatency, formatCalibrationRate } from "@/lib/telemetry-metrics";
import { ErrorBoundary } from "@/components/error-boundary";
import { FixtureSelector } from "@/components/fixture-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  LazyWrapper, 
  LazyDataVisualization, 
  LazyScrapedInsights, 
  LazyTeamPerformance, 
  LazyDetailedPredictionAnalysis,
  LazyLiveMatches,
  LazyPredictionsPanel,
  LazyLeagueStandings,
  LazyQuickStats
} from "@/components/lazy-wrapper";
import { useScreenReaderAnnouncement } from "@/components/accessibility";
import { Section } from "@/components/layout/section";
import { Grid } from "@/components/layout/grid";
import type { Fixture } from "@shared/schema";
import { SetupRequiredCard } from "@/components/setup-required-card";
import { AlertTriangle, BarChart3, Database, Gauge, Hourglass, LifeBuoy, Lightbulb, MousePointerClick, Sparkles, Target, Timer, TrendingUp, XCircle } from "lucide-react";

import { DegradedModeBanner } from '@/components/degraded-mode-banner';
export default function Dashboard() {
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const { announce, AnnouncementRegion } = useScreenReaderAnnouncement();
  const { selectedLeague, selectedSeason } = useLeagueStore();
  const cardSurfaceClass = "glass-effect hover-lift smooth-transition rounded-xl p-1";

  // API calls with error handling
  const { data: stats, loading: isLoadingStats } = useApi<any>('/api/stats', { retry: true });
  const { metrics: telemetryMetrics, loading: telemetryLoading } = useTelemetrySummary();
  const { metrics: ingestionMetrics, loading: ingestionLoading } = useIngestionSummary();

  const calibrationRate = useMemo(() => formatCalibrationRate(telemetryMetrics.calibrationRate), [telemetryMetrics.calibrationRate]);
  const avgLatency = useMemo(() => telemetryMetrics.totalFixtures === 0 ? "N/A" : formatLatency(telemetryMetrics.averageLatencyMs), [telemetryMetrics.averageLatencyMs, telemetryMetrics.totalFixtures]);
  const fallbackCount = useMemo(() => telemetryMetrics.fallbackFixtures ?? 0, [telemetryMetrics.fallbackFixtures]);
  const totalFixtures = useMemo(() => telemetryMetrics.totalFixtures ?? 0, [telemetryMetrics.totalFixtures]);

  const totalIngestions = ingestionMetrics.total ?? 0;
  const failedIngestions = ingestionMetrics.failed ?? 0;
  const ingestionFallbacks = ingestionMetrics.fallbacks ?? 0;
  const avgIngestionDuration = ingestionMetrics.avgDurationMs ?? null;

  const telemetryDescription = useMemo(() => {
    if (selectedLeague && selectedSeason) {
      return `Realtime telemetry · League ${selectedLeague} · Season ${selectedSeason}`;
    }
    if (selectedLeague) {
      return `Realtime telemetry · League ${selectedLeague}`;
    }
    if (selectedSeason) {
      return `Realtime telemetry · Season ${selectedSeason}`;
    }
    return "Realtime telemetry across competitions";
  }, [selectedLeague, selectedSeason]);

  const tabTitles: Record<string, string> = {
    overview: "Overview",
    predictions: "AI Predictions",
    analytics: "Analytics",
    insights: "Insights"
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    const title = tabTitles[value] ?? value;
    announce(`Dashboard view switched to ${title}`);
  };

  const avgIngestionDurationDisplay = ingestionLoading || avgIngestionDuration == null
    ? "N/A"
    : `${Math.round(avgIngestionDuration)} ms`;

  return (
    <>
      <AnnouncementRegion />
      <div className="space-y-8 pb-24">
        <DegradedModeBanner />
        <SetupRequiredCard />

        <Section title="Today's Pulse" description={telemetryDescription}>
          <Grid cols={{ base: 1, md: 2, xl: 4 }} gap={4}>
            <Card className={cardSurfaceClass}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
                  <div>
                    <div className="text-2xl font-bold">{telemetryLoading ? "..." : totalFixtures}</div>
                    <div className="text-sm text-muted-foreground">Fixtures Analyzed</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardSurfaceClass}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-accent" aria-hidden="true" />
                  <div>
                    <div className="text-2xl font-bold">{telemetryLoading ? "..." : calibrationRate}</div>
                    <div className="text-sm text-muted-foreground">Calibration Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardSurfaceClass}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Timer className="h-4 w-4 text-success" aria-hidden="true" />
                  <div>
                    <div className="text-2xl font-bold">{telemetryLoading ? "..." : avgLatency}</div>
                    <div className="text-sm text-muted-foreground">Avg Latency</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardSurfaceClass}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-4 w-4 text-secondary" aria-hidden="true" />
                  <div>
                    <div className="text-2xl font-bold">{telemetryLoading ? "..." : fallbackCount}</div>
                    <div className="text-sm text-muted-foreground">Fallback Predictions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Section>

        <Section title="Ingestion Health" description="Provenance, reliability and fallbacks">
          <Grid cols={{ base: 1, md: 2, xl: 4 }} gap={4}>
            <Card className={cardSurfaceClass}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Database className="h-4 w-4 text-primary" aria-hidden="true" />
                  <div>
                    <div className="text-2xl font-bold">{ingestionLoading ? "..." : totalIngestions}</div>
                    <div className="text-sm text-muted-foreground">Total Ingestion Events</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardSurfaceClass}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <XCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                  <div>
                    <div className="text-2xl font-bold">{ingestionLoading ? "..." : failedIngestions}</div>
                    <div className="text-sm text-muted-foreground">Failed Events</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardSurfaceClass}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <LifeBuoy className="h-4 w-4 text-secondary" aria-hidden="true" />
                  <div>
                    <div className="text-2xl font-bold">{ingestionLoading ? "..." : ingestionFallbacks}</div>
                    <div className="text-sm text-muted-foreground">Fallbacks</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={cardSurfaceClass}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Hourglass className="h-4 w-4 text-accent" aria-hidden="true" />
                  <div>
                    <div className="text-2xl font-bold">{avgIngestionDurationDisplay}</div>
                    <div className="text-sm text-muted-foreground">Avg Ingestion Duration</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Section>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1 glass-effect rounded-xl p-1">
            <TabsTrigger
              value="overview"
              className="flex items-center justify-center space-x-1 md:space-x-2 text-xs md:text-sm text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg transition-colors"
            >
              <Gauge className="h-3 w-3 md:h-4 md:w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Overview</span>
              <span className="sm:hidden">Home</span>
            </TabsTrigger>
            <TabsTrigger
              value="predictions"
              className="flex items-center justify-center space-x-1 md:space-x-2 text-xs md:text-sm text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg transition-colors"
            >
              <Sparkles className="h-3 w-3 md:h-4 md:w-4" aria-hidden="true" />
              <span className="hidden sm:inline">AI Predictions</span>
              <span className="sm:hidden">AI</span>
              <Badge variant="secondary" className="ml-1 text-xs hidden md:inline">ML</Badge>
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              className="flex items-center justify-center space-x-1 md:space-x-2 text-xs md:text-sm text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg transition-colors"
            >
              <BarChart3 className="h-3 w-3 md:h-4 md:w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Analytics</span>
              <span className="sm:hidden">Stats</span>
            </TabsTrigger>
            <TabsTrigger
              value="insights"
              className="flex items-center justify-center space-x-1 md:space-x-2 text-xs md:text-sm text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary rounded-lg transition-colors"
            >
              <Lightbulb className="h-3 w-3 md:h-4 md:w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Insights</span>
              <span className="sm:hidden">Data</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Section title="Live Matches" description="Real-time match updates and scores">
              <LazyWrapper minHeight="250px">
                <LazyLiveMatches />
              </LazyWrapper>
            </Section>

            <Grid cols={{ base: 1, lg: 3 }} gap={8}>
              <div className="lg:col-span-2 space-y-6">
                <Section title="AI Predictions" description="Model-driven forecasts with confidence">
                  <LazyWrapper minHeight="400px">
                    <LazyPredictionsPanel />
                  </LazyWrapper>
                </Section>
              </div>

              <div className="space-y-6">
                <Section title="Standings" description="League table and team form">
                  <LazyWrapper minHeight="500px">
                    <LazyLeagueStandings />
                  </LazyWrapper>
                </Section>
                <Section title="Quick Stats" description="At-a-glance metrics">
                  <LazyWrapper minHeight="200px">
                    <LazyQuickStats />
                  </LazyWrapper>
                </Section>
              </div>
            </Grid>
          </TabsContent>

          {/* AI Predictions Tab */}
          <TabsContent value="predictions" className="space-y-6">
            <Grid cols={{ base: 1, lg: 2 }} gap={8}>
              <ErrorBoundary>
                <FixtureSelector 
                  onFixtureSelect={(fixture) => setSelectedFixture(fixture)}
                  selectedFixture={selectedFixture}
                />
              </ErrorBoundary>
              
              <div className="space-y-6">
                {selectedFixture ? (
                  <LazyWrapper fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
                    <LazyDetailedPredictionAnalysis fixtureId={selectedFixture.id} />
                  </LazyWrapper>
                ) : (
                  <Card className={cardSurfaceClass}>
                    <CardContent className="p-8 text-center">
                      <MousePointerClick className="mx-auto mb-4 h-10 w-10 text-muted-foreground" aria-hidden="true" />
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Select a Match
                      </h3>
                      <p className="text-muted-foreground">
                        Choose a fixture from the list to get detailed AI-powered predictions and analysis.
                      </p>
                    </CardContent>
                  </Card>
                )}
                
                <LazyWrapper fallback={<div className="h-64 bg-muted animate-pulse rounded" />}>
                  <LazyTeamPerformance />
                </LazyWrapper>
              </div>
            </Grid>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <ErrorBoundary>
              <LazyWrapper fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
                <LazyDataVisualization />
              </LazyWrapper>
            </ErrorBoundary>
            
            <Grid cols={{ base: 1, lg: 2 }} gap={8}>
              <Card className={cardSurfaceClass}>
                <CardHeader>
                  <CardTitle>Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Model Accuracy</span>
                      <span className="text-lg font-bold text-success">82.4%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-success" style={{ width: "82.4%" }}></div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                      <div>
                        <div className="font-medium text-primary">1,247</div>
                        <div className="text-muted-foreground">Predictions</div>
                      </div>
                      <div>
                        <div className="font-medium text-success">1,027</div>
                        <div className="text-muted-foreground">Correct</div>
                      </div>
                      <div>
                        <div className="font-medium text-destructive">220</div>
                        <div className="text-muted-foreground">Incorrect</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className={cardSurfaceClass}>
                <CardHeader>
                  <CardTitle>Data Quality</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">xG Data Coverage</span>
                      <span className="text-sm font-medium">{isLoadingStats ? '...' : `${stats?.dataQuality?.xgDataCoverage || 95}%`}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Team Form Data</span>
                      <span className="text-sm font-medium">{isLoadingStats ? '...' : `${stats?.dataQuality?.teamFormData || 88}%`}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Injury Reports</span>
                      <span className="text-sm font-medium">{isLoadingStats ? '...' : `${stats?.dataQuality?.injuryReports || 76}%`}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">H2H History</span>
                      <span className="text-sm font-medium">{isLoadingStats ? '...' : `${stats?.dataQuality?.h2hHistory || 92}%`}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Grid>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <ErrorBoundary>
              <LazyWrapper fallback={<div className="h-96 bg-muted animate-pulse rounded" />}>
                <LazyScrapedInsights />
              </LazyWrapper>
            </ErrorBoundary>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
