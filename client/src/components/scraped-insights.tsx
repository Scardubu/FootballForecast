import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, Target, BarChart3, AlertCircle, Activity } from "lucide-react";
import type { ScrapedData } from "@/lib/types";

interface InsightCardProps {
  title: string;
  icon: React.ReactNode;
  data: ScrapedData | null;
  isLoading: boolean;
}

function InsightCard({ title, icon, data, isLoading }: InsightCardProps) {
  if (isLoading) {
    return (
      <Card data-testid={`insight-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {icon}
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card data-testid={`insight-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            {icon}
            <span>{title}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-2 py-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
            <div className="text-sm text-muted-foreground">No data available</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid={`insight-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {icon}
            <span>{title}</span>
          </div>
          <Badge variant="secondary" data-testid="confidence-badge">
            {(data.confidence * 100).toFixed(0)}% confidence
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center space-y-2">
          <div className="text-lg font-bold" data-testid="insight-value">
            {data.dataType === 'xg_data' && typeof data.data === 'object' && data.data !== null
              ? `${(data.data as any).expectedGoals || 0} xG`
              : data.dataType === 'team_ratings' && typeof data.data === 'object' && data.data !== null
              ? `${(data.data as any).rating || 0}/100`
              : data.dataType === 'team_form' && typeof data.data === 'object' && data.data !== null
              ? `${(data.data as any).formString || 'N/A'}`
              : 'Processing...'}
          </div>
          <div className="text-sm text-muted-foreground" data-testid="insight-description">
            {data.dataType === 'xg_data' ? 'Expected Goals'
             : data.dataType === 'team_ratings' ? 'Team Performance Rating'
             : data.dataType === 'team_form' ? 'Current Form'
             : data.dataType === 'match_insights' ? 'Match Analysis'
             : data.dataType === 'match_stats' ? 'Match Statistics'
             : 'Advanced Metric'}
          </div>
          <div className="text-xs text-muted-foreground" data-testid="data-source">
            Source: {data.source}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ScrapedInsights() {
  const { data: scrapedData, isLoading, error } = useQuery<ScrapedData[]>({
    queryKey: ['/api/scraped-data'],
    refetchInterval: 30000, // Refresh every 30 seconds for fresh insights
  });

  // Group scraped data by type for display
  const xgData = scrapedData?.find(d => d.dataType === 'xg_data') || null;
  const teamRatings = scrapedData?.find(d => d.dataType === 'team_ratings') || null;
  const teamForm = scrapedData?.find(d => d.dataType === 'team_form') || null;
  const matchInsights = scrapedData?.find(d => d.dataType === 'match_insights') || null;

  if (error) {
    return (
      <div className="space-y-6">
        <Card data-testid="scraped-insights-error">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
              <div className="text-lg font-semibold">Unable to load insights</div>
              <div className="text-sm text-muted-foreground">
                Failed to fetch scraped data. Please try again later.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="scraped-insights">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <InsightCard 
          title="xG Analysis"
          icon={<Target className="h-5 w-5 text-primary" />}
          data={xgData}
          isLoading={isLoading}
        />
        <InsightCard 
          title="Team Ratings"
          icon={<BarChart3 className="h-5 w-5 text-secondary" />}
          data={teamRatings}
          isLoading={isLoading}
        />
        <InsightCard 
          title="Form Analysis"
          icon={<TrendingUp className="h-5 w-5 text-accent" />}
          data={teamForm}
          isLoading={isLoading}
        />
        <InsightCard 
          title="Match Insights"
          icon={<Activity className="h-5 w-5 text-success" />}
          data={matchInsights}
          isLoading={isLoading}
        />
      </div>
      
      {!isLoading && scrapedData && scrapedData.length === 0 && (
        <Card data-testid="no-scraped-data">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <div className="text-lg font-semibold">Advanced Insights Coming Soon</div>
                <div className="text-sm text-muted-foreground max-w-md mx-auto">
                  Our data scraping services are collecting advanced analytics from multiple sources. 
                  Check back soon for xG data, team ratings, and detailed match insights.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {!isLoading && scrapedData && scrapedData.length > 0 && (
        <Card data-testid="scraped-data-summary">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <span>Data Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{scrapedData.length}</div>
                <div className="text-xs text-muted-foreground">Total Insights</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-secondary">
                  {new Set(scrapedData.map(d => d.source)).size}
                </div>
                <div className="text-xs text-muted-foreground">Data Sources</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">
                  {((scrapedData.reduce((sum, d) => sum + d.confidence, 0) / scrapedData.length) * 100).toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">Avg Confidence</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-success">
                  {Math.max(...scrapedData.map(d => 
                    Math.floor((new Date().getTime() - new Date(d.scrapedAt).getTime()) / (1000 * 60))
                  ))}m
                </div>
                <div className="text-xs text-muted-foreground">Last Updated</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}