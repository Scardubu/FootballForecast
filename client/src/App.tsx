import { Suspense, lazy } from 'react';
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { LoadingState } from "@/components/loading";

// Lazy load page components for better performance
const Dashboard = lazy(() => import("@/pages/dashboard"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  const { isLoading } = useAuth();

  // Show loading screen while authentication is in progress
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingState 
          message="Authenticating..." 
          className="min-h-screen"
        />
      </div>
    );
  }

  return (
    <Suspense fallback={<LoadingState message="Loading page..." className="min-h-screen" />}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

import { LiveStatusBannerAuto } from "@/components/live-status-banner-auto";
import { DegradedModeBanner } from "@/components/degraded-mode-banner";

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <DegradedModeBanner />
            <LiveStatusBannerAuto />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
