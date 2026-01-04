/**
 * Error Boundary for Calendar
 *
 * Catches React errors in the calendar component tree and displays a fallback UI.
 * Prevents the entire app from crashing if there's an error in the calendar.
 */

import { Component, ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@courseweb/ui";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class CalendarErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[Calendar Error Boundary]:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // TODO: Log to error tracking service (Sentry, etc.)
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />

          <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-gray-100">
            Something went wrong
          </h2>

          <p className="text-gray-600 dark:text-gray-400 mb-6 text-center max-w-md">
            {this.state.error?.message ||
              "An unexpected error occurred in the calendar"}
          </p>

          <div className="flex gap-3">
            <Button onClick={this.handleReset} variant="outline">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Try Again
            </Button>

            <Button onClick={this.handleReload}>Reload Page</Button>
          </div>

          {process.env.NODE_ENV === "development" && this.state.errorInfo && (
            <details className="mt-8 max-w-2xl w-full">
              <summary className="cursor-pointer text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                Show error details
              </summary>
              <pre className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto max-h-64">
                {this.state.error?.stack}
                {"\n\n"}
                {this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary for simpler use cases
 */
export function CalendarErrorFallback({
  error,
  resetError,
}: {
  error: Error;
  resetError: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[200px] p-6">
      <AlertTriangle className="w-12 h-12 text-red-500 mb-3" />
      <h3 className="text-lg font-semibold mb-2">Error loading calendar</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 text-center">
        {error.message}
      </p>
      <Button onClick={resetError} size="sm" variant="outline">
        <RefreshCcw className="w-3 h-3 mr-2" />
        Retry
      </Button>
    </div>
  );
}
