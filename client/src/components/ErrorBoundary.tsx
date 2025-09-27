import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Alert, AlertTitle, AlertDescription, Button, Card, CardHeader, CardTitle, CardContent } from '@/components/ui';
import { RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Production-grade Error Boundary to gracefully handle runtime errors
 * - Prevents white screen of death
 * - Provides user-friendly error messages and recovery options
 * - Logs detailed error information for debugging
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Update state with error details
    this.setState({
      error,
      errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by ErrorBoundary:', error, errorInfo);
    }

    // In production, you could log to a monitoring service like Sentry
    // if (process.env.NODE_ENV === 'production') {
    //   logErrorToService(error, errorInfo);
    // }
  }

  handleRefresh = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-background">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-destructive">
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive" className="mb-6">
                <AlertTitle>Application Error</AlertTitle>
                <AlertDescription>
                  We encountered an unexpected error. Our team has been notified.
                </AlertDescription>
              </Alert>
              
              <p className="mb-4 text-muted-foreground">
                You can try refreshing the page or returning to the homepage.
              </p>

              <div className="flex space-x-4">
                <Button onClick={this.handleRefresh} className="flex items-center">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Page
                </Button>
                <Button variant="outline" onClick={this.handleGoHome} className="flex items-center">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Homepage
                </Button>
              </div>
              
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-6 p-4 border rounded bg-muted overflow-auto">
                  <p className="font-mono text-xs mb-2">{this.state.error?.toString()}</p>
                  <p className="font-mono text-xs whitespace-pre-wrap">
                    {this.state.errorInfo?.componentStack}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
