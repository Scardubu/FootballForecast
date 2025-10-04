import { TelemetryDashboard } from "@/components/TelemetryDashboard";

export default function TelemetryPage() {
  return (
    <div className="container py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">System Telemetry</h1>
        <p className="text-muted-foreground">
          Monitor data ingestion, prediction sync, and system health metrics in real-time
        </p>
      </div>
      
      <TelemetryDashboard />
    </div>
  );
}
