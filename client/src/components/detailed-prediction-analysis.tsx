import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from './loading';
import type { Prediction } from '@shared/schema';

interface DetailedPredictionAnalysisProps {
  fixtureId: number;
}

export function DetailedPredictionAnalysis({ fixtureId }: DetailedPredictionAnalysisProps) {
  const { data: prediction, isLoading, error } = useQuery({
    queryKey: ['prediction', fixtureId],
    queryFn: () => apiClient.getPredictions(fixtureId),
    enabled: !!fixtureId, // Only run query if fixtureId is available
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Detailed Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingState message="Analyzing match with ML models..." />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Could not load prediction data.</p>
        </CardContent>
      </Card>
    );
  }

  if (!prediction) {
    return null; // Or a placeholder
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <i className="fas fa-chart-line text-primary"></i>
          <span>Detailed Analysis</span>
          <Badge variant="outline" className="ml-auto">Live AI</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 text-center bg-muted/50 p-4 rounded-lg">
          <div>
            <div className="font-bold text-lg">{`${parseFloat(prediction.homeWinProbability || '0').toFixed(0)}%`}</div>
            <div className="text-sm text-muted-foreground">Home Win</div>
          </div>
          <div>
            <div className="font-bold text-lg">{`${parseFloat(prediction.drawProbability || '0').toFixed(0)}%`}</div>
            <div className="text-sm text-muted-foreground">Draw</div>
          </div>
          <div>
            <div className="font-bold text-lg">{`${parseFloat(prediction.awayWinProbability || '0').toFixed(0)}%`}</div>
            <div className="text-sm text-muted-foreground">Away Win</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
                <div className="font-medium mb-2">Expected Goals</div>
                <p>Home: {parseFloat(prediction.expectedGoalsHome || '0').toFixed(2)}</p>
                <p>Away: {parseFloat(prediction.expectedGoalsAway || '0').toFixed(2)}</p>
            </div>
            <div>
                <div className="font-medium mb-2">Other Markets</div>
                <p>Over 2.5: {`${parseFloat(prediction.over25Goals || '0').toFixed(0)}%`}</p>
                <p>BTTS: {`${parseFloat(prediction.bothTeamsScore || '0').toFixed(0)}%`}</p>
            </div>
        </div>
         <div className="text-xs text-muted-foreground pt-2 border-t border-border">
            Model: {prediction.mlModel || 'N/A'} | Confidence: {`${parseFloat(prediction.confidence || '0').toFixed(1)}%`}
        </div>
      </CardContent>
    </Card>
  );
}
