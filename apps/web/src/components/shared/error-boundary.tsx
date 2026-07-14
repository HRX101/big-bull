'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 p-8 text-center">
            <h2 className="font-display text-2xl">Something went wrong</h2>
            <p className="text-muted-foreground">An unexpected error occurred. Please try again.</p>
            <Button onClick={() => this.setState({ hasError: false })}>Retry</Button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
