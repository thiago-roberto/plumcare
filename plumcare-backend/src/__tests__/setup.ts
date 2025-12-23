import 'reflect-metadata';
import { vi, beforeAll, afterAll, afterEach } from 'vitest';

// Mock environment variables
process.env.PORT = '8000';
process.env.NODE_ENV = 'test';
process.env.MEDPLUM_BASE_URL = 'http://localhost:3000';
process.env.MEDPLUM_CLIENT_ID = 'test-client-id';
process.env.MEDPLUM_CLIENT_SECRET = 'test-client-secret';

// Global test setup
beforeAll(() => {
  // Setup code that runs once before all tests
  console.log('Starting test suite...');
});

afterAll(() => {
  // Cleanup code that runs once after all tests
  console.log('Test suite complete.');
});

afterEach(() => {
  // Reset all mocks after each test
  vi.clearAllMocks();
});

// Mock console methods to reduce noise in test output
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});
