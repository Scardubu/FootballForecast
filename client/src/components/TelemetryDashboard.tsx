import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Database, CheckCircle2, XCircle, Clock, TrendingUp } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { formatDistanceToNow } from "date-fns";

interface IngestionEvent {
  id: string;
  source: string;
  scope: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  recordsWritten: number | null;
  fallbackUsed: boolean;
  metadata?: any;
  error?: string | null;
}

interface IngestionSummary {
  events: IngestionEvent[];
  summary: {
    totalEvents: number;
    successfulEvents: number;
    failedEvents: number;
    degradedEvents: number;
    totalRecordsWritten: number;
    averageDurationMs: number;
  };
}

export function TelemetryDashboard() {
  const { data, isLoading, error } = useQuery<IngestionSummary>({
    queryKey: ["telemetry-ingestion"],
    queryFn: () => apiClient.getIngestionSummary(20),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Error Loading Telemetry
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Failed to load telemetry data"}
          </p>
        </CardContent>
      </Card>
    );
  }

  const summary = data?.summary;
  const events = data?.events || [];

  const successRate = summary?.totalEvents
    ? ((summary.successfulEvents / summary.totalEvents) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalEvents || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 20 ingestion events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {summary?.successfulEvents || 0} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Records Written</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.totalRecordsWritten || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total records ingested
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary?.averageDurationMs ? `${(summary.averageDurationMs / 1000).toFixed(1)}s` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Average processing time
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Events */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Ingestion Events</CardTitle>
          <CardDescription>
            Detailed view of the most recent data ingestion operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No ingestion events recorded yet
              </p>
            ) : (
              events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EventCard({ event }: { event: IngestionEvent }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "degraded":
        return (
          <Badge variant="secondary" className="bg-yellow-500 text-black">
            <Activity className="h-3 w-3 mr-1" />
            Degraded
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case "running":
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-500">
            <Clock className="h-3 w-3 mr-1 animate-spin" />
            Running
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const timeAgo = event.startedAt
    ? formatDistanceToNow(new Date(event.startedAt), { addSuffix: true })
    : "Unknown";

  const duration = event.durationMs
    ? event.durationMs > 1000
      ? `${(event.durationMs / 1000).toFixed(1)}s`
      : `${event.durationMs}ms`
    : "N/A";

  return (
    <div className="flex items-start justify-between border rounded-lg p-4 hover:bg-accent/50 transition-colors">
      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm">{event.source}</span>
          <span className="text-xs text-muted-foreground">•</span>
          <span className="text-sm text-muted-foreground">{event.scope}</span>
          {getStatusBadge(event.status)}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{timeAgo}</span>
          <span>•</span>
          <span>Duration: {duration}</span>
          {event.recordsWritten !== null && (
            <>
              <span>•</span>
              <span>{event.recordsWritten} records</span>
            </>
          )}
          {event.fallbackUsed && (
            <>
              <span>•</span>
              <Badge variant="outline" className="text-xs">
                Fallback Used
              </Badge>
            </>
          )}
        </div>

        {event.error && (
          <div className="text-xs text-destructive bg-destructive/10 p-2 rounded">
            Error: {event.error}
          </div>
        )}

        {event.metadata && Object.keys(event.metadata).length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Show metadata
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded overflow-x-auto">
              {JSON.stringify(event.metadata, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
