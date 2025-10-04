import React, { Suspense, lazy } from 'react';
import { Router, Route, Switch } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ErrorBoundary } from "@/components/error-boundary";
import { AppLayout } from "@/components/layout/app-layout";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PerformanceMonitor } from "@/components/performance-monitor";
import { envConfig } from "@/lib/env-config";
import { LiveStatusBannerAuto } from "@/components/live-status-banner-auto";
import { DegradedModeBanner } from "@/components/degraded-mode-banner";
import "./index.css";

// Import offline mode tester for development
if (import.meta.env.DEV) {
  import("@/lib/offline-mode-tester").then(() => {
    console.log("🔧 Offline Mode Tester loaded!");
    console.log("💡 Use window.offlineTest.goOffline() to test offline mode");
    console.log("💡 Use window.offlineTest.goOnline() to restore online mode");
    console.log("💡 Use window.offlineTest.toggle() to toggle modes");
    console.log("💡 Use window.offlineTest.test() to run comprehensive test");
  });
}

// Add retry logic for lazy loading pages
const retryLazyLoad = (importFn: () => Promise<any>, retries = 3, interval = 1500) => {
  return new Promise<any>((resolve, reject) => {
    importFn()
      .then(resolve)
      .catch((error) => {
        // When we're in offline mode, don't retry to avoid unnecessary network requests
        const isOffline = localStorage.getItem('serverStatus') === 'offline' || window.isServerOffline === true;
        if (retries === 0 || isOffline) {
          // Last attempt failed or we're offline
          reject(error);
          return;
        }
        
        // Retry after delay
        setTimeout(() => {
          retryLazyLoad(importFn, retries - 1, interval)
            .then(resolve)
            .catch(reject);
        }, interval);
      });
  });
};

const Dashboard = lazy(() => retryLazyLoad(() => import("@/pages/dashboard")));
const BettingInsights = lazy(() => retryLazyLoad(() => import("@/pages/betting-insights")));
const Telemetry = lazy(() => retryLazyLoad(() => import("@/pages/telemetry")));
const NotFound = lazy(() => retryLazyLoad(() => import("@/pages/not-found")));

function SimpleLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// Fallback component for when dynamic imports fail
function ImportErrorFallback() {
  const isOffline = localStorage.getItem('serverStatus') === 'offline' || window.isServerOffline === true;
  
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="text-destructive text-4xl mb-4">
          <i className="fas fa-exclamation-triangle"></i>
        </div>
        <h2 className="text-xl font-bold mb-2">{isOffline ? "Offline Mode" : "Loading Error"}</h2>
        <p className="text-muted-foreground mb-6">
          {isOffline 
            ? "The application is running in offline mode with limited functionality. Some components couldn't be loaded."
            : "Failed to load required components. This could be due to network issues or a server problem."}
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          <i className="fas fa-refresh mr-2"></i>
          Refresh Page
        </button>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { isLoading, error } = useAuth();
  if (isLoading) {
    return <SimpleLoading message="Authenticating..." />;
  }
  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-bold text-destructive mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button className="px-4 py-2 rounded bg-primary text-primary-foreground" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }
  return (
    <AppLayout>
      <ErrorBoundary fallback={<ImportErrorFallback />}>
        <Suspense fallback={<SimpleLoading message="Loading..." />}>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/betting-insights" component={BettingInsights} />
            <Route path="/telemetry" component={Telemetry} />
            <Route component={NotFound} />
          </Switch>
        </Suspense>
      </ErrorBoundary>
    </AppLayout>
  );
}

export default function App() {
  // Log environment configuration on mount (dev only)
  React.useEffect(() => {
    envConfig.logConfig();
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <PerformanceMonitor />
            <Toaster />
            <DegradedModeBanner />
            <LiveStatusBannerAuto />
            <Router>
              <AppRoutes />
            </Router>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
