import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest';
import type { Resource } from '@medplum/fhirtypes';

// Track initial event count for relative assertions
let initialEventCount = 0;

// Mock Redis - not ready, using fallback
vi.mock('../../../core/database/index.js', () => ({
  redis: {
    isReady: vi.fn().mockReturnValue(false),
    lpush: vi.fn().mockResolvedValue(1),
    ltrim: vi.fn().mockResolvedValue('OK'),
    expire: vi.fn().mockResolvedValue(1),
    lrange: vi.fn().mockResolvedValue([]),
  },
  CacheTTL: {
    WEBHOOK_EVENTS: 3600,
  },
}));

// Mock sync service
vi.mock('../../sync/sync.service.js', () => ({
  addSyncEvent: vi.fn().mockResolvedValue({
    id: 'sync-test-123',
    timestamp: '2024-01-15T10:00:00Z',
    system: 'athena',
    type: 'patient',
    action: 'created',
    resourceId: 'Patient/test-1',
    status: 'success',
  }),
}));

import * as webhooksService from '../webhooks.service.js';

describe('WebhooksService', () => {
  beforeAll(async () => {
    // Get the initial count of events (from other tests that may have run)
    const result = await webhooksService.getWebhookEvents();
    initialEventCount = result.total;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWebhookEvent', () => {
    it('should create a webhook event from a FHIR resource', async () => {
      const resource: Resource = {
        resourceType: 'Patient',
        id: 'patient-123',
        name: [{ family: 'Smith', given: ['John'] }],
      } as Resource;

      const event = await webhooksService.createWebhookEvent(resource);

      expect(event).toHaveProperty('id');
      expect(event.id).toMatch(/^webhook-/);
      expect(event.resourceType).toBe('Patient');
      expect(event.resourceId).toBe('patient-123');
      expect(event.action).toBe('create');
      expect(event.processed).toBe(false);
      expect(event.timestamp).toBeDefined();
    });

    it('should include subscription ID if provided', async () => {
      const resource: Resource = {
        resourceType: 'Encounter',
        id: 'encounter-456',
        status: 'planned',
        class: { code: 'AMB' },
      } as Resource;

      const event = await webhooksService.createWebhookEvent(resource, 'sub-789');

      expect(event.subscriptionId).toBe('sub-789');
    });

    it('should handle resources without ID', async () => {
      const resource: Resource = {
        resourceType: 'Task',
        status: 'requested',
        intent: 'order',
      } as Resource;

      const event = await webhooksService.createWebhookEvent(resource);

      expect(event.resourceId).toBe('unknown');
    });
  });

  describe('processWebhookEvent', () => {
    it('should process a Patient webhook event', async () => {
      const event = await webhooksService.createWebhookEvent({
        resourceType: 'Patient',
        id: 'patient-123',
        name: [{ family: 'Doe', given: ['Jane'] }],
      } as Resource);

      await webhooksService.processWebhookEvent(event);

      expect(event.processed).toBe(true);
    });

    it('should process an Encounter webhook event', async () => {
      const event = await webhooksService.createWebhookEvent({
        resourceType: 'Encounter',
        id: 'encounter-123',
        status: 'planned',
        class: { code: 'AMB' },
      } as Resource);

      await webhooksService.processWebhookEvent(event);

      expect(event.processed).toBe(true);
    });

    it('should process a DiagnosticReport webhook event', async () => {
      const event = await webhooksService.createWebhookEvent({
        resourceType: 'DiagnosticReport',
        id: 'report-123',
        status: 'final',
        code: { text: 'CBC' },
      } as Resource);

      await webhooksService.processWebhookEvent(event);

      expect(event.processed).toBe(true);
    });

    it('should process a Task webhook event', async () => {
      const event = await webhooksService.createWebhookEvent({
        resourceType: 'Task',
        id: 'task-123',
        status: 'requested',
        intent: 'order',
        description: 'Test task',
      } as Resource);

      await webhooksService.processWebhookEvent(event);

      expect(event.processed).toBe(true);
    });

    it('should handle unknown resource types', async () => {
      const event = await webhooksService.createWebhookEvent({
        resourceType: 'Observation',
        id: 'obs-123',
        status: 'final',
        code: { text: 'test' },
      } as Resource);

      await webhooksService.processWebhookEvent(event);

      expect(event.processed).toBe(true);
    });
  });

  describe('getWebhookEvents', () => {
    it('should return events', async () => {
      const countBefore = (await webhooksService.getWebhookEvents()).total;

      await webhooksService.createWebhookEvent({
        resourceType: 'Patient',
        id: 'patient-new',
      } as Resource);

      const result = await webhooksService.getWebhookEvents();

      expect(result.total).toBe(countBefore + 1);
      expect(result.events.length).toBeGreaterThan(0);
    });

    it('should filter by resourceType', async () => {
      // Create specific events for this test
      await webhooksService.createWebhookEvent({
        resourceType: 'Medication',
        id: 'med-filter-test',
        status: 'active',
        code: { text: 'Aspirin' },
      } as Resource);

      const result = await webhooksService.getWebhookEvents({ resourceType: 'Medication' });

      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events.every(e => e.resourceType === 'Medication')).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const result = await webhooksService.getWebhookEvents({ limit: 2 });

      expect(result.events.length).toBeLessThanOrEqual(2);
    });
  });

  describe('getWebhookEventById', () => {
    it('should return event by ID', async () => {
      const created = await webhooksService.createWebhookEvent({
        resourceType: 'Patient',
        id: 'patient-find-me',
      } as Resource);

      const found = await webhooksService.getWebhookEventById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.resourceId).toBe('patient-find-me');
    });

    it('should return undefined for non-existent ID', async () => {
      const result = await webhooksService.getWebhookEventById('non-existent-id-xyz');

      expect(result).toBeUndefined();
    });
  });
});
