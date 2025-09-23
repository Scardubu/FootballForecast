import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, TrendingUp, Target, BarChart3 } from "lucide-react";
import type { ScrapedData } from "@/lib/types";

export function DataVisualization() {
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
            
            <div className="h-64 bg-muted rounded-lg flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-chart-area text-4xl text-muted-foreground mb-2"></i>
                <p className="text-muted-foreground">Interactive Goals Trend Chart</p>
                <p className="text-xs text-muted-foreground mt-1">Real-time data visualization</p>
              </div>
            </div>
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
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Wins</span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Man City</span>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: "60%" }}></div>
                    </div>
                    <span className="text-sm font-medium" data-testid="city-wins">3</span>
                  </div>
                  <span className="text-muted-foreground">vs</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium" data-testid="arsenal-wins">1</span>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-secondary" style={{ width: "20%" }}></div>
                    </div>
                    <span className="text-sm">Arsenal</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Goals Scored</span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Man City</span>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: "70%" }}></div>
                    </div>
                    <span className="text-sm font-medium" data-testid="city-goals">7</span>
                  </div>
                  <span className="text-muted-foreground">vs</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium" data-testid="arsenal-goals">4</span>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-secondary" style={{ width: "40%" }}></div>
                    </div>
                    <span className="text-sm">Arsenal</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Clean Sheets</span>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Man City</span>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: "40%" }}></div>
                    </div>
                    <span className="text-sm font-medium" data-testid="city-clean-sheets">2</span>
                  </div>
                  <span className="text-muted-foreground">vs</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium" data-testid="arsenal-clean-sheets">1</span>
                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-secondary" style={{ width: "20%" }}></div>
                    </div>
                    <span className="text-sm">Arsenal</span>
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
