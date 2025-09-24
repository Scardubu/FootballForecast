import React from "react";
import { LiveStatusBanner } from "@/components/live-status-banner";
import { useWebSocket } from "@/hooks/use-websocket";

export const LiveStatusBannerAuto: React.FC = () => {
  const { error } = useWebSocket();
  if (!error) return null;
  // Only show banner if error indicates WS is unavailable in prod
  if (
    error.toLowerCase().includes("not available") ||
    error.toLowerCase().includes("disabled") ||
    error.toLowerCase().includes("unavailable")
  ) {
    return <LiveStatusBanner message={error} />;
  }
  return null;
};
