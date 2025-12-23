import type { Request, Response, NextFunction } from 'express';
import { vi } from 'vitest';

/**
 * Test helper utilities
 */

/**
 * Create a mock Express request object
 */
export function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    params: {},
    query: {},
    body: {},
    headers: {},
    get: vi.fn(),
    ...overrides,
  } as unknown as Request;
}

/**
 * Create a mock Express response object
 */
export function createMockResponse(): Response & {
  _status: number;
  _json: unknown;
} {
  const res = {
    _status: 200,
    _json: null as unknown,
    status: vi.fn().mockImplementation(function (this: typeof res, code: number) {
      this._status = code;
      return this;
    }),
    json: vi.fn().mockImplementation(function (this: typeof res, data: unknown) {
      this._json = data;
      return this;
    }),
    send: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response & { _status: number; _json: unknown };
}

/**
 * Create a mock Express next function
 */
export function createMockNext(): NextFunction & { _error: unknown } {
  let capturedError: unknown = undefined;
  const mockFn = vi.fn().mockImplementation((error?: unknown) => {
    capturedError = error;
  });
  Object.defineProperty(mockFn, '_error', {
    get() {
      return capturedError;
    },
  });
  return mockFn as unknown as NextFunction & { _error: unknown };
}

/**
 * Wait for async operations to complete
 */
export function waitForAsync(ms = 0): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a mock async function that resolves after a delay
 */
export function createDelayedMock<T>(value: T, delayMs = 10): () => Promise<T> {
  return async () => {
    await waitForAsync(delayMs);
    return value;
  };
}

/**
 * Assert that a function throws an error
 */
export async function expectAsyncThrow(
  fn: () => Promise<unknown>,
  errorMessage?: string
): Promise<void> {
  let threw = false;
  try {
    await fn();
  } catch (error) {
    threw = true;
    if (errorMessage && error instanceof Error) {
      if (!error.message.includes(errorMessage)) {
        throw new Error(
          `Expected error message to include "${errorMessage}", but got "${error.message}"`
        );
      }
    }
  }
  if (!threw) {
    throw new Error('Expected function to throw an error, but it did not');
  }
}

/**
 * Create pagination query params
 */
export function createPaginationQuery(limit = 10, offset = 0): { limit: string; offset: string } {
  return {
    limit: String(limit),
    offset: String(offset),
  };
}
