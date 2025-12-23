import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as syncService from '../sync.service.js';

// Mock the Medplum client
vi.mock('../../../shared/medplum/index.js', () => ({
  getMedplumClient: vi.fn().mockReturnValue({
    executeBatch: vi.fn().mockResolvedValue({
      entry: [
        { response: { status: '201 Created' } },
        { response: { status: '201 Created' } },
      ],
    }),
  }),
  createSyncAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

// Mock Redis - not ready, using fallback
vi.mock('../../../core/database/index.js', () => ({
  redis: {
    isReady: vi.fn().mockReturnValue(false),
    lpush: vi.fn().mockResolvedValue(1),
    ltrim: vi.fn().mockResolvedValue('OK'),
    expire: vi.fn().mockResolvedValue(1),
    lrange: vi.fn().mockResolvedValue([]),
    llen: vi.fn().mockResolvedValue(0),
    delete: vi.fn().mockResolvedValue(1),
  },
  CacheKeys: {
    syncState: (system: string) => `sync:${system}`,
  },
  CacheTTL: {
    SYNC_STATE: 3600,
  },
}));

// Mock providers
vi.mock('../../../providers/athena/athena.mock.js', () => ({
  AthenaMockProvider: vi.fn().mockImplementation(() => ({
    authenticate: vi.fn().mockResolvedValue(undefined),
    getNativePatientData: vi.fn().mockResolvedValue({ data: [] }),
    getCcdaDocuments: vi.fn().mockResolvedValue({ data: [] }),
    getHl7v2Messages: vi.fn().mockResolvedValue({ data: [] }),
  })),
}));

vi.mock('../../../providers/elation/elation.mock.js', () => ({
  ElationMockProvider: vi.fn().mockImplementation(() => ({
    authenticate: vi.fn().mockResolvedValue(undefined),
    getNativePatientData: vi.fn().mockResolvedValue({ data: [] }),
    getCcdaDocuments: vi.fn().mockResolvedValue({ data: [] }),
    getHl7v2Messages: vi.fn().mockResolvedValue({ data: [] }),
  })),
}));

vi.mock('../../../providers/nextgen/nextgen.mock.js', () => ({
  NextGenMockProvider: vi.fn().mockImplementation(() => ({
    authenticate: vi.fn().mockResolvedValue(undefined),
    getNativePatientData: vi.fn().mockResolvedValue({ data: [] }),
    getCcdaDocuments: vi.fn().mockResolvedValue({ data: [] }),
    getHl7v2Messages: vi.fn().mockResolvedValue({ data: [] }),
  })),
}));

vi.mock('../../../providers/base.provider.js', () => ({
  getProvider: vi.fn().mockImplementation((system: string) => ({
    authenticate: vi.fn().mockResolvedValue(undefined),
    getNativePatientData: vi.fn().mockResolvedValue({ data: [] }),
    getCcdaDocuments: vi.fn().mockResolvedValue({ data: [] }),
    getHl7v2Messages: vi.fn().mockResolvedValue({ data: [] }),
  })),
}));

describe('SyncService', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await syncService.clearSyncEvents();
  });

  describe('getSyncEvents', () => {
    it('should return empty array when no events exist', async () => {
      const result = await syncService.getSyncEvents();

      expect(result.events).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should return events with default pagination', async () => {
      await syncService.addSyncEvent({
        system: 'athena',
        type: 'patient',
        action: 'created',
        resourceId: 'Patient/test-1',
        status: 'success',
        details: 'Test sync event',
      });

      const result = await syncService.getSyncEvents();

      expect(result.events.length).toBe(1);
      expect(result.total).toBe(1);
      expect(result.events[0].system).toBe('athena');
    });

    it('should filter by system', async () => {
      await syncService.addSyncEvent({
        system: 'athena',
        type: 'patient',
        action: 'created',
        resourceId: 'Patient/athena-1',
        status: 'success',
      });
      await syncService.addSyncEvent({
        system: 'elation',
        type: 'patient',
        action: 'created',
        resourceId: 'Patient/elation-1',
        status: 'success',
      });

      const result = await syncService.getSyncEvents({ system: 'athena' });

      expect(result.events.length).toBe(1);
      expect(result.events[0].system).toBe('athena');
    });

    it('should respect limit and offset', async () => {
      for (let i = 0; i < 5; i++) {
        await syncService.addSyncEvent({
          system: 'athena',
          type: 'patient',
          action: 'created',
          resourceId: `Patient/test-${i}`,
          status: 'success',
        });
      }

      const result = await syncService.getSyncEvents({ limit: 2, offset: 1 });

      expect(result.events.length).toBe(2);
    });
  });

  describe('addSyncEvent', () => {
    it('should add a sync event with generated id and timestamp', async () => {
      const event = await syncService.addSyncEvent({
        system: 'athena',
        type: 'patient',
        action: 'created',
        resourceId: 'Patient/test-1',
        status: 'success',
        details: 'Test event',
      });

      expect(event.id).toBeDefined();
      expect(event.id).toMatch(/^sync-/);
      expect(event.timestamp).toBeDefined();
      expect(event.system).toBe('athena');
      expect(event.type).toBe('patient');
      expect(event.status).toBe('success');
    });
  });

  describe('clearSyncEvents', () => {
    it('should clear all sync events', async () => {
      await syncService.addSyncEvent({
        system: 'athena',
        type: 'patient',
        action: 'created',
        resourceId: 'Patient/test-1',
        status: 'success',
      });

      await syncService.clearSyncEvents();

      const result = await syncService.getSyncEvents();
      expect(result.events.length).toBe(0);
    });
  });

  describe('initializeDemoSyncEvents', () => {
    it('should initialize demo sync events', async () => {
      await syncService.clearSyncEvents();
      await syncService.initializeDemoSyncEvents();

      const result = await syncService.getSyncEvents();

      expect(result.events.length).toBe(3);
      expect(result.events.some(e => e.system === 'athena')).toBe(true);
      expect(result.events.some(e => e.system === 'elation')).toBe(true);
      expect(result.events.some(e => e.system === 'nextgen')).toBe(true);
    });
  });

  describe('performSync', () => {
    it('should perform sync for athena system', async () => {
      const result = await syncService.performSync('athena');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('syncedResources');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('events');
    });

    it('should perform sync for elation system', async () => {
      const result = await syncService.performSync('elation');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('syncedResources');
    });

    it('should perform sync for nextgen system', async () => {
      const result = await syncService.performSync('nextgen');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('syncedResources');
    });
  });
});
