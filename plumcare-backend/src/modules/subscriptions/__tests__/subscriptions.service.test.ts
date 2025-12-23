import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as subscriptionsService from '../subscriptions.service.js';
import { getMedplumClient } from '../../../shared/medplum/index.js';

// Mock the Medplum client
vi.mock('../../../shared/medplum/index.js', () => ({
  getMedplumClient: vi.fn(),
}));

describe('SubscriptionsService', () => {
  const mockSubscription = {
    resourceType: 'Subscription',
    id: 'sub-123',
    status: 'active',
    reason: 'Patient create notifications',
    criteria: 'Patient',
    channel: {
      type: 'rest-hook',
      endpoint: 'http://backend:8000/api/webhooks/medplum',
    },
  };

  const mockMedplumClient = {
    createResource: vi.fn(),
    readResource: vi.fn(),
    updateResource: vi.fn(),
    deleteResource: vi.fn(),
    searchResources: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMedplumClient).mockReturnValue(mockMedplumClient as any);
  });

  describe('getSubscriptions', () => {
    it('should return all subscriptions from Medplum', async () => {
      const mockSubscriptions = [mockSubscription];
      mockMedplumClient.searchResources.mockResolvedValue(mockSubscriptions);

      const result = await subscriptionsService.getSubscriptions();

      expect(mockMedplumClient.searchResources).toHaveBeenCalledWith('Subscription', {
        _count: '100',
      });
      expect(result).toEqual(mockSubscriptions);
    });
  });

  describe('getSubscription', () => {
    it('should return a specific subscription by ID', async () => {
      mockMedplumClient.readResource.mockResolvedValue(mockSubscription);

      const result = await subscriptionsService.getSubscription('sub-123');

      expect(mockMedplumClient.readResource).toHaveBeenCalledWith('Subscription', 'sub-123');
      expect(result).toEqual(mockSubscription);
    });

    it('should return undefined if subscription not found', async () => {
      mockMedplumClient.readResource.mockRejectedValue(new Error('Not found'));

      const result = await subscriptionsService.getSubscription('non-existent');

      expect(result).toBeUndefined();
    });
  });

  describe('createSubscription', () => {
    it('should create a new subscription', async () => {
      mockMedplumClient.createResource.mockResolvedValue(mockSubscription);

      const result = await subscriptionsService.createSubscription({
        name: 'Patient Create',
        criteria: 'Patient',
        endpoint: 'http://backend:8000/api/webhooks/medplum',
      });

      expect(mockMedplumClient.createResource).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: 'Subscription',
          status: 'active',
          criteria: 'Patient',
        })
      );
      expect(result).toEqual(mockSubscription);
    });

    it('should add interaction extension if provided', async () => {
      mockMedplumClient.createResource.mockResolvedValue(mockSubscription);

      await subscriptionsService.createSubscription({
        name: 'Patient Create',
        criteria: 'Patient',
        endpoint: 'http://backend:8000/api/webhooks/medplum',
        interaction: 'create',
      });

      expect(mockMedplumClient.createResource).toHaveBeenCalledWith(
        expect.objectContaining({
          extension: expect.arrayContaining([
            expect.objectContaining({
              url: 'https://medplum.com/fhir/StructureDefinition/subscription-supported-interaction',
              valueCode: 'create',
            }),
          ]),
        })
      );
    });
  });

  describe('updateSubscription', () => {
    it('should update subscription metadata', async () => {
      const updatedSubscription = { ...mockSubscription, reason: 'Updated name' };
      mockMedplumClient.readResource.mockResolvedValue(mockSubscription);
      mockMedplumClient.updateResource.mockResolvedValue(updatedSubscription);

      const result = await subscriptionsService.updateSubscription('sub-123', {
        name: 'Updated name',
      });

      expect(mockMedplumClient.updateResource).toHaveBeenCalled();
      expect(result).toEqual(updatedSubscription);
    });
  });

  describe('deleteSubscription', () => {
    it('should delete a subscription', async () => {
      mockMedplumClient.deleteResource.mockResolvedValue(undefined);

      await subscriptionsService.deleteSubscription('sub-123');

      expect(mockMedplumClient.deleteResource).toHaveBeenCalledWith('Subscription', 'sub-123');
    });
  });

  describe('pauseSubscription', () => {
    it('should set subscription status to off', async () => {
      const pausedSubscription = { ...mockSubscription, status: 'off' };
      mockMedplumClient.readResource.mockResolvedValue(mockSubscription);
      mockMedplumClient.updateResource.mockResolvedValue(pausedSubscription);

      const result = await subscriptionsService.pauseSubscription('sub-123');

      expect(mockMedplumClient.updateResource).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'off' })
      );
      expect(result.status).toBe('off');
    });
  });

  describe('resumeSubscription', () => {
    it('should set subscription status to active', async () => {
      const pausedSubscription = { ...mockSubscription, status: 'off' };
      const resumedSubscription = { ...mockSubscription, status: 'active' };
      mockMedplumClient.readResource.mockResolvedValue(pausedSubscription);
      mockMedplumClient.updateResource.mockResolvedValue(resumedSubscription);

      const result = await subscriptionsService.resumeSubscription('sub-123');

      expect(mockMedplumClient.updateResource).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' })
      );
      expect(result.status).toBe('active');
    });
  });

  describe('createDefaultSubscriptions', () => {
    it('should create default subscriptions for common resource types', async () => {
      mockMedplumClient.createResource.mockResolvedValue(mockSubscription);

      const result = await subscriptionsService.createDefaultSubscriptions();

      expect(mockMedplumClient.createResource).toHaveBeenCalled();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
