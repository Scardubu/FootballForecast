import React from "react";
import { LiveStatusBanner } from "@/components/live-status-banner";
import { useWebSocket } from "@/hooks/use-websocket";

export const LiveStatusBannerAuto: React.FC = () => {
  const { error } = useWebSocket();
  
  // Don't show banner in development mode - WebSocket is intentionally disabled
  const isDevelopment = import.meta.env.DEV === true;
  if (isDevelopment) return null;
  
  if (!error) return null;
  
  // Only show banner if error indicates WS is unavailable in production
  if (
    error.toLowerCase().includes("not available") ||
    error.toLowerCase().includes("disabled") ||
    error.toLowerCase().includes("unavailable")
  ) {
    return <LiveStatusBanner message={error} />;
  }
  return null;
};
