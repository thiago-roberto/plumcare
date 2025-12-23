import { vi } from 'vitest';
import type { Patient, Encounter, Subscription, Bot, Bundle } from '@medplum/fhirtypes';

/**
 * Mock Medplum Client
 *
 * Provides a mock implementation of the Medplum client for testing.
 */

export const mockMedplumClient = {
  // Authentication
  startClientLogin: vi.fn().mockResolvedValue(undefined),

  // Resource operations
  createResource: vi.fn(),
  readResource: vi.fn(),
  updateResource: vi.fn(),
  deleteResource: vi.fn(),

  // Search operations
  search: vi.fn(),
  searchResources: vi.fn(),

  // Batch operations
  executeBatch: vi.fn(),

  // Bot operations
  executeBot: vi.fn(),

  // FHIR URL helpers
  fhirUrl: vi.fn((resourceType: string, id?: string, operation?: string) => {
    let url = `/${resourceType}`;
    if (id) url += `/${id}`;
    if (operation) url += `/${operation}`;
    return url;
  }),

  // HTTP methods
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

/**
 * Reset all mock implementations
 */
export function resetMedplumMocks(): void {
  Object.values(mockMedplumClient).forEach((mock) => {
    if (typeof mock.mockReset === 'function') {
      mock.mockReset();
    }
  });
}

/**
 * Setup mock to return patients
 */
export function mockSearchPatients(patients: Patient[]): void {
  mockMedplumClient.searchResources.mockResolvedValue(patients);
  mockMedplumClient.search.mockResolvedValue({
    resourceType: 'Bundle',
    type: 'searchset',
    total: patients.length,
    entry: patients.map((p) => ({ resource: p })),
  } as Bundle);
}

/**
 * Setup mock to return encounters
 */
export function mockSearchEncounters(encounters: Encounter[]): void {
  mockMedplumClient.searchResources.mockResolvedValue(encounters);
  mockMedplumClient.search.mockResolvedValue({
    resourceType: 'Bundle',
    type: 'searchset',
    total: encounters.length,
    entry: encounters.map((e) => ({ resource: e })),
  } as Bundle);
}

/**
 * Setup mock to return subscriptions
 */
export function mockSearchSubscriptions(subscriptions: Subscription[]): void {
  mockMedplumClient.searchResources.mockResolvedValue(subscriptions);
}

/**
 * Setup mock to return bots
 */
export function mockSearchBots(bots: Bot[]): void {
  mockMedplumClient.searchResources.mockResolvedValue(bots);
}

/**
 * Setup mock to return a single resource
 */
export function mockReadResource<T>(resource: T): void {
  mockMedplumClient.readResource.mockResolvedValue(resource);
}

/**
 * Setup mock to throw an error on read
 */
export function mockReadResourceNotFound(): void {
  mockMedplumClient.readResource.mockRejectedValue(new Error('Not found'));
}

/**
 * Setup mock for resource creation
 */
export function mockCreateResource<T>(resource: T): void {
  mockMedplumClient.createResource.mockResolvedValue(resource);
}

/**
 * Setup mock for resource update
 */
export function mockUpdateResource<T>(resource: T): void {
  mockMedplumClient.updateResource.mockResolvedValue(resource);
}

/**
 * Setup mock for batch execution
 */
export function mockExecuteBatch(bundle: Bundle): void {
  mockMedplumClient.executeBatch.mockResolvedValue(bundle);
}

/**
 * Setup mock for bot execution
 */
export function mockExecuteBot(result: unknown): void {
  mockMedplumClient.executeBot.mockResolvedValue(result);
}

// Export the mock module for vi.mock
export default mockMedplumClient;
