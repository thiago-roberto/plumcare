import { notifications } from '@mantine/notifications';

export interface ApiErrorOptions {
  context?: string;
  showNotification?: boolean;
}

export function handleApiError(error: unknown, options: ApiErrorOptions = {}): void {
  const { context, showNotification = true } = options;

  const message = error instanceof Error ? error.message : 'An unexpected error occurred';

  console.error(`[${context || 'API'}]`, error);

  if (showNotification) {
    notifications.show({
      title: 'Error',
      message,
      color: 'red',
      autoClose: 5000,
    });
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError && error.message.includes('fetch');
}

export function isApiError(error: unknown): boolean {
  return error instanceof Error && error.name === 'ApiError';
}
