import React, { Component, ReactNode, ErrorInfo } from 'react';
import { logger } from '@/lib/logger';
import { AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to our logging service
    logger.error('ErrorBoundary caught an error:', error, errorInfo);

    // Update state with error info
    this.setState({
      errorInfo,
    });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // If a custom fallback is provided, use it
      if (this.props.fallback && this.state.errorInfo) {
        return this.props.fallback(this.state.error, this.state.errorInfo, this.handleReset);
      }

      // Default fallback UI
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Something went wrong
                </h1>
                <p className="text-muted-foreground mb-4">
                  The application encountered an unexpected error. This has been logged and
                  we apologize for the inconvenience.
                </p>

                {/* Error details (only in development) */}
                {import.meta.env.DEV && this.state.error && (
                  <div className="mb-4">
                    <details className="bg-muted p-4 rounded-lg">
                      <summary className="cursor-pointer font-medium text-sm mb-2">
                        Error Details (Development Only)
                      </summary>
                      <div className="mt-2 space-y-2">
                        <div>
                          <p className="text-xs font-mono text-destructive">
                            {this.state.error.name}: {this.state.error.message}
                          </p>
                        </div>
                        {this.state.error.stack && (
                          <div>
                            <p className="text-xs font-mono text-muted-foreground whitespace-pre-wrap overflow-auto max-h-48">
                              {this.state.error.stack}
                            </p>
                          </div>
                        )}
                        {this.state.errorInfo && (
                          <div>
                            <p className="text-xs font-semibold text-foreground mb-1">
                              Component Stack:
                            </p>
                            <p className="text-xs font-mono text-muted-foreground whitespace-pre-wrap overflow-auto max-h-48">
                              {this.state.errorInfo.componentStack}
                            </p>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                )}

                <div className="flex gap-3">
                  <Button onClick={this.handleReset} variant="default">
                    Try Again
                  </Button>
                  <Button
                    onClick={() => window.location.reload()}
                    variant="outline"
                  >
                    Reload Page
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Functional wrapper for Error Boundary (for easier usage)
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}
