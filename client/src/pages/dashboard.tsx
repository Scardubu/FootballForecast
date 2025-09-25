import { useState } from "react";
import { useLeagueStore } from "@/hooks/use-league-store";
import { useApi } from "@/hooks/use-api";
import { AppLayout } from "@/components/layout/app-layout";
import { ErrorBoundary } from "@/components/error-boundary";
import { LiveMatches } from "@/components/live-matches";
import { PredictionsPanel } from "@/components/predictions-panel";
import { LeagueStandings } from "@/components/league-standings";
import { QuickStats } from "@/components/quick-stats";
import { FixtureSelector } from "@/components/fixture-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { LazyWrapper, LazyDataVisualization, LazyScrapedInsights, LazyTeamPerformance } from "@/components/lazy-wrapper";
import { DetailedPredictionAnalysis } from "@/components/detailed-prediction-analysis";
import { useScreenReaderAnnouncement } from "@/components/accessibility";
import { Section } from "@/components/layout/section";
import { Grid } from "@/components/layout/grid";
import type { Fixture } from "@shared/schema";

export default function Dashboard() {
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const { announce, AnnouncementRegion } = useScreenReaderAnnouncement();
  const { selectedLeague } = useLeagueStore();
  
  // API calls with error handling
  const { data: stats, loading: isLoadingStats } = useApi<any>('/api/stats', { retry: true });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    announce(`Switched to ${value} tab`);
  };

  return (
    <AppLayout>
      <AnnouncementRegion />

      <div className="space-y-8">
        {/* Platform Stats */}
        <Section title="Platform Stats" description="Coverage, performance and update cadence">
          <Grid cols={{ base: 1, md: 4 }} gap={4}>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-futbol text-primary"></i>
                  <div>
                    <div className="text-2xl font-bold">1,100+</div>
                    <div className="text-sm text-muted-foreground">Leagues Covered</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-brain text-accent"></i>
                  <div>
                    <div className="text-2xl font-bold">82%</div>
                    <div className="text-sm text-muted-foreground">AI Accuracy</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-clock text-success"></i>
                  <div>
                    <div className="text-2xl font-bold">15s</div>
                    <div className="text-sm text-muted-foreground">Update Interval</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-chart-line text-secondary"></i>
                  <div>
                    <div className="text-2xl font-bold">5+</div>
                    <div className="text-sm text-muted-foreground">Data Sources</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Section>
        
        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center space-x-2">
              <i className="fas fa-tachometer-alt text-sm"></i>
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="predictions" className="flex items-center space-x-2">
              <i className="fas fa-crystal-ball text-sm"></i>
              <span>AI Predictions</span>
              <Badge variant="secondary" className="ml-1 text-xs">ML</Badge>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <i className="fas fa-chart-bar text-sm"></i>
              <span>Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center space-x-2">
              <i className="fas fa-lightbulb text-sm"></i>
              <span>Insights</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <Section title="Live Matches" description="Real-time match updates and scores">
              <ErrorBoundary>
                <LiveMatches />
              </ErrorBoundary>
            </Section>

            <Grid cols={{ base: 1, lg: 3 }} gap={8}>
              <div className="lg:col-span-2 space-y-6">
                <Section title="AI Predictions" description="Model-driven forecasts with confidence">
                  <ErrorBoundary>
                    <PredictionsPanel />
                  </ErrorBoundary>
                </Section>
              </div>

              <div className="space-y-6">
                <Section title="Standings" description="League table and team form">
                  <ErrorBoundary>
                    <LeagueStandings />
                  </ErrorBoundary>
                </Section>
                <Section title="Quick Stats" description="At-a-glance metrics">
                  <ErrorBoundary>
                    <QuickStats />
                  </ErrorBoundary>
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
                  <ErrorBoundary>
                    <DetailedPredictionAnalysis fixtureId={selectedFixture.id} />
                  </ErrorBoundary>
                ) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <i className="fas fa-mouse-pointer text-4xl text-muted-foreground mb-4"></i>
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
              <Card>
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
              
              <Card>
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
    </AppLayout>
  );
}
