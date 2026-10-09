import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '../design-system';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ error, errorInfo });
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const isDev = Boolean(import.meta.env.DEV);

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-xl w-full p-8 bg-white/90 backdrop-blur-md rounded-3xl border border-red-200 shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={32} />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black font-display text-[#171044] uppercase tracking-wide">
                Something Went Wrong
              </h2>
              <p className="text-sm text-[#171044]/70 max-w-md mx-auto">
                We encountered an unexpected issue rendering this view. You can reload the page or navigate to another section.
              </p>
            </div>

            <div className="flex justify-center gap-3">
              <Button
                variant="primary"
                onClick={this.handleReload}
                iconLeft={<RefreshCw size={16} />}
              >
                Reload Page
              </Button>
            </div>

            {isDev && this.state.error && (
              <div className="text-left mt-6 p-4 bg-red-50/90 rounded-2xl border border-red-200/80 overflow-x-auto text-xs space-y-2">
                <div className="font-mono font-bold text-red-900 break-all">
                  {this.state.error.name}: {this.state.error.message}
                </div>
                {this.state.errorInfo?.componentStack && (
                  <pre className="font-mono text-[11px] text-red-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Route-aware ErrorBoundary that automatically resets error state when navigation pathname changes.
 */
export const RouteErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const location = useLocation();
  return <ErrorBoundaryClass key={location.pathname}>{children}</ErrorBoundaryClass>;
};

export const ErrorBoundary = RouteErrorBoundary;
