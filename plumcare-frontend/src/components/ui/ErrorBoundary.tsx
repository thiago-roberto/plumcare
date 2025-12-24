import { Component, ReactNode } from 'react';
import { Paper, Text, Button, Stack } from '@mantine/core';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Paper p="xl" withBorder>
          <Stack align="center" gap="md">
            <Text c="red" fw={600} size="lg">
              Something went wrong
            </Text>
            <Text size="sm" c="dimmed" ta="center">
              {this.state.error?.message || 'An unexpected error occurred'}
            </Text>
            <Button onClick={() => window.location.reload()}>Reload Page</Button>
          </Stack>
        </Paper>
      );
    }

    return this.props.children;
  }
}
