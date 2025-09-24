import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="max-w-lg w-full">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-destructive">
                <i className="fas fa-exclamation-triangle"></i>
                <span>Something went wrong</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertDescription>
                  We encountered an unexpected error. Please try refreshing the page or contact support if the problem persists.
                </AlertDescription>
              </Alert>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    Error Details (Development)
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              
              <div className="flex space-x-2">
                <Button onClick={this.handleRetry} variant="default">
                  <i className="fas fa-redo mr-2"></i>
                  Try Again
                </Button>
                <Button onClick={() => window.location.reload()} variant="outline">
                  <i className="fas fa-refresh mr-2"></i>
                  Refresh Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Lightweight error fallback for smaller components
export function ErrorFallback({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <Alert className="my-4">
      <i className="fas fa-exclamation-triangle"></i>
      <AlertDescription className="flex items-center justify-between">
        <span>Failed to load this section</span>
        <Button onClick={resetError} size="sm" variant="outline">
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );
}
