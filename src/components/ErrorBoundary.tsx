import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log error in production
    if (import.meta.env.PROD) {
      // Here you could send to Sentry, LogRocket, etc.
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Une erreur est survenue
            </h2>
            
            <p className="text-gray-600 mb-6">
              {import.meta.env.DEV 
                ? this.state.error?.message || 'Erreur inconnue'
                : 'Nous sommes désolés, une erreur inattendue s\'est produite.'
              }
            </p>

            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="text-left bg-gray-50 p-4 rounded-lg mb-6 text-sm">
                <summary className="cursor-pointer font-medium text-gray-700 mb-2">
                  Détails techniques
                </summary>
                <pre className="whitespace-pre-wrap text-xs text-gray-600 overflow-auto max-h-40">
                  {this.state.error?.stack}
                  {'\n\n'}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <Button
                onClick={this.handleReload}
                className="bg-teal-600 hover:bg-teal-700"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Recharger la page
              </Button>
              
              <Button
                variant="outline"
                onClick={() => window.history.back()}
              >
                Retour
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
