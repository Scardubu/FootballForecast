import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
    staleTime: 1000 * 60 * 15, // 15 minutes (prevent constant reloads)
    retry: 1, // Only retry once
    refetchOnWindowFocus: false, // Prevent reload on tab switch
    refetchOnReconnect: false, // Prevent reload on network reconnect
  });

  const latency = prediction?.latencyMs ?? prediction?.serviceLatencyMs ?? null;
  const calibration = (prediction?.calibrationMetadata || undefined) as {
    method?: string;
    temperature?: number;
    applied?: boolean;
  } | undefined;
  const predictedOutcomeLabel = prediction?.predictedOutcome?.toUpperCase();
  const calibrationSummary = calibration
    ? [
        calibration.method ? `method: ${calibration.method}` : null,
        typeof calibration.temperature === 'number' ? `T=${calibration.temperature.toFixed(2)}` : null,
        calibration.applied === false ? 'pending' : 'applied'
      ].filter(Boolean).join(' • ')
    : null;

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

        {(latency !== null || calibrationSummary) && (
          <div className="bg-muted/60 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
            {latency !== null && (
              <div className="flex items-center space-x-2" data-testid={`latency-${fixtureId}`}>
                <i className="fas fa-stopwatch" aria-hidden />
                <span>Latency: <span className="font-medium text-foreground">{latency} ms</span></span>
              </div>
            )}
            {calibrationSummary && (
              <div className="flex items-center space-x-2" data-testid={`calibration-${fixtureId}`}>
                <i className="fas fa-balance-scale" aria-hidden />
                <span>Calibration {calibrationSummary}</span>
              </div>
            )}
          </div>
        )}

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
            <div className="flex flex-wrap items-center gap-3">
              <span>Model: {prediction.mlModel || 'N/A'}</span>
              <Tooltip>
                <TooltipTrigger className="underline-offset-4 decoration-dotted underline">
                  Confidence: {`${parseFloat(prediction.confidence || '0').toFixed(1)}%`}
                </TooltipTrigger>
                <TooltipContent>
                  <p>Model confidence accounts for data freshness and calibration quality.</p>
                </TooltipContent>
              </Tooltip>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
