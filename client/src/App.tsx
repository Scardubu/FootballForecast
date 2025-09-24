import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ErrorBoundary } from "@/components/error-boundary";
import { LoadingState } from "@/components/loading";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";

function Router() {
  const { isLoading } = useAuth();

  // Show loading screen while authentication is in progress
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <LoadingState 
          message="Loading Football Forecast..." 
          className="min-h-screen"
        />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
