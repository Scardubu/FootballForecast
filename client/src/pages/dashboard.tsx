import { useState } from "react";
import { Header } from "@/components/header";
import { LiveMatches } from "@/components/live-matches";
import { PredictionsPanel } from "@/components/predictions-panel";
import { LeagueStandings } from "@/components/league-standings";
import { TeamPerformance, QuickStats } from "@/components/team-performance";
import { DataVisualization } from "@/components/data-visualization";
import { FixtureSelector } from "@/components/fixture-selector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { Fixture } from "@/lib/types";

export default function Dashboard() {
  const [selectedFixture, setSelectedFixture] = useState<Fixture | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section with Platform Stats */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          </div>
        </div>
        
        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
            <LiveMatches />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <PredictionsPanel />
              </div>
              
              <div className="space-y-6">
                <LeagueStandings />
                <QuickStats />
              </div>
            </div>
          </TabsContent>

          {/* AI Predictions Tab */}
          <TabsContent value="predictions" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <FixtureSelector 
                onFixtureSelect={setSelectedFixture}
                selectedFixture={selectedFixture}
              />
              
              <div className="space-y-6">
                {selectedFixture ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <i className="fas fa-chart-line text-primary"></i>
                        <span>Detailed Analysis</span>
                        <Badge variant="outline" className="ml-auto">
                          Live AI
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="text-center p-6 bg-muted/50 rounded-lg">
                          <i className="fas fa-cog fa-spin text-2xl text-muted-foreground mb-2"></i>
                          <div className="text-sm text-muted-foreground">
                            Analyzing match with ML models...
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="font-medium mb-2">Data Sources</div>
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <i className="fas fa-check text-success text-xs"></i>
                                <span className="text-muted-foreground">FBref (xG Data)</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <i className="fas fa-check text-success text-xs"></i>
                                <span className="text-muted-foreground">WhoScored (Ratings)</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <i className="fas fa-check text-success text-xs"></i>
                                <span className="text-muted-foreground">Team Form</span>
                              </div>
                            </div>
                          </div>
                          
                          <div>
                            <div className="font-medium mb-2">ML Features</div>
                            <div className="space-y-1">
                              <div className="flex items-center space-x-2">
                                <i className="fas fa-brain text-accent text-xs"></i>
                                <span className="text-muted-foreground">xG Analysis</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <i className="fas fa-brain text-accent text-xs"></i>
                                <span className="text-muted-foreground">Form Trends</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <i className="fas fa-brain text-accent text-xs"></i>
                                <span className="text-muted-foreground">H2H History</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
                
                <TeamPerformance />
              </div>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <DataVisualization />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                      <span className="text-sm font-medium">94%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Team Form Data</span>
                      <span className="text-sm font-medium">98%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Injury Reports</span>
                      <span className="text-sm font-medium">76%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">H2H History</span>
                      <span className="text-sm font-medium">89%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <i className="fas fa-trophy text-secondary"></i>
                    <span>Top Performer</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <div className="text-lg font-bold">Manchester City</div>
                    <div className="text-sm text-muted-foreground">8 wins in a row</div>
                    <div className="text-2xl font-bold text-success">94.2</div>
                    <div className="text-xs text-muted-foreground">Performance Rating</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <i className="fas fa-chart-trending-up text-accent"></i>
                    <span>Rising Team</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <div className="text-lg font-bold">Brighton</div>
                    <div className="text-sm text-muted-foreground">+15% improvement</div>
                    <div className="text-2xl font-bold text-accent">↗️</div>
                    <div className="text-xs text-muted-foreground">Last 5 matches</div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <i className="fas fa-bullseye text-primary"></i>
                    <span>Best Bet</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-2">
                    <div className="text-lg font-bold">Arsenal vs Chelsea</div>
                    <div className="text-sm text-muted-foreground">Over 2.5 Goals</div>
                    <div className="text-2xl font-bold text-primary">87%</div>
                    <div className="text-xs text-muted-foreground">Confidence</div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>AI Model Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                    <div className="flex items-start space-x-3">
                      <i className="fas fa-lightbulb text-accent mt-1"></i>
                      <div>
                        <div className="font-medium text-accent mb-1">Key Pattern Discovered</div>
                        <div className="text-sm text-muted-foreground">
                          Teams with 70%+ home possession in their last 3 matches have an 84% chance of scoring first in their next home game.
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                    <div className="flex items-start space-x-3">
                      <i className="fas fa-chart-line text-success mt-1"></i>
                      <div>
                        <div className="font-medium text-success mb-1">Trend Alert</div>
                        <div className="text-sm text-muted-foreground">
                          Expected goals (xG) differential is the strongest predictor this season, with 91% correlation to match outcomes.
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-secondary/10 rounded-lg border border-secondary/20">
                    <div className="flex items-start space-x-3">
                      <i className="fas fa-exclamation-triangle text-secondary mt-1"></i>
                      <div>
                        <div className="font-medium text-secondary mb-1">Anomaly Detected</div>
                        <div className="text-sm text-muted-foreground">
                          Home advantage effect has decreased by 12% compared to last season across the top 5 leagues.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      
      {/* Footer */}
      <footer className="bg-card border-t border-border mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <i className="fas fa-futbol text-primary-foreground"></i>
                </div>
                <span className="font-bold text-primary">SabiScore Analytics</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Real-time football insights powered by advanced analytics and AI predictions.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-3">Features</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Live Match Tracking</li>
                <li>AI Predictions</li>
                <li>Team Analytics</li>
                <li>Historical Data</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-3">Data Sources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>API-Football</li>
                <li>Real-time Updates</li>
                <li>15-second Refresh</li>
                <li>1100+ Leagues</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-foreground mb-3">Connect</h4>
              <div className="flex space-x-4">
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <i className="fab fa-twitter"></i>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <i className="fab fa-facebook"></i>
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary">
                  <i className="fab fa-instagram"></i>
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-border mt-8 pt-8 text-center">
            <p className="text-sm text-muted-foreground">
              © 2025 SabiScore Analytics. All rights reserved. | Data provided by API-Football
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
