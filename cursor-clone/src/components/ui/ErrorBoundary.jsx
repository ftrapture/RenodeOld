import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // In production, you might want to log to an error reporting service
    // logErrorToService(error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null 
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-vscode-bg flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-vscode-bg-secondary rounded-lg border border-vscode-border p-8">
            {/* Error Icon */}
            <div className="flex items-center justify-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <span className="text-3xl">💥</span>
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-2xl font-bold text-vscode-text text-center mb-4">
              Oops! Something went wrong
            </h1>

            {/* Error Description */}
            <p className="text-vscode-text-secondary text-center mb-6">
              The Enhanced Cursor Editor encountered an unexpected error. 
              This might be a temporary issue that can be resolved by reloading the application.
            </p>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-vscode-bg rounded border border-vscode-border">
                <h3 className="text-sm font-semibold text-vscode-text mb-2">Error Details:</h3>
                <div className="text-xs font-mono text-red-400 mb-2">
                  {this.state.error.toString()}
                </div>
                {this.state.errorInfo && (
                  <details className="text-xs font-mono text-vscode-text-secondary">
                    <summary className="cursor-pointer mb-2 text-vscode-text">Stack Trace</summary>
                    <pre className="whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="px-6 py-2 bg-vscode-accent hover:bg-vscode-accent-hover text-white rounded transition-colors"
              >
                Reload Application
              </button>
              
              <button
                onClick={this.handleReset}
                className="px-6 py-2 bg-vscode-bg-tertiary hover:bg-vscode-border text-vscode-text rounded border border-vscode-border transition-colors"
              >
                Try Again
              </button>
            </div>

            {/* Help Text */}
            <div className="mt-8 pt-6 border-t border-vscode-border text-center">
              <p className="text-xs text-vscode-text-secondary mb-2">
                If the problem persists, try these steps:
              </p>
              <ul className="text-xs text-vscode-text-secondary space-y-1">
                <li>• Clear your browser cache and cookies</li>
                <li>• Disable browser extensions temporarily</li>
                <li>• Check your internet connection</li>
                <li>• Try using a different browser</li>
              </ul>
            </div>

            {/* Additional Info */}
            <div className="mt-4 pt-4 border-t border-vscode-border text-center">
              <p className="text-xs text-vscode-text-secondary">
                Enhanced Cursor Editor v1.0.0
              </p>
              <p className="text-xs text-vscode-text-secondary">
                Error ID: {Date.now().toString(36).toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;