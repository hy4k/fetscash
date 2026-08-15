import React, { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-background text-money-paper flex items-center justify-center p-6">
          <div className="max-w-lg w-full glass-panel rounded-2xl p-8 border border-red-500/30 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="text-red-400" size={28} />
            </div>
            <h1 className="text-xl font-black text-red-400 uppercase tracking-widest font-serif mb-2">Something went wrong</h1>
            <p className="text-sm text-text-secondary mb-4">The application encountered an unexpected error.</p>
            <pre className="text-xs text-red-400/80 bg-surface p-3 rounded-lg overflow-auto max-h-40">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-red-500/80 hover:bg-red-500 border border-red-500/30 transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
