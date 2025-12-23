import { describe, it, expect, beforeEach, vi } from 'vitest';
import { subscriptionsController } from '../subscriptions.controller.js';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../__tests__/utils/test-helpers.js';
import {
  subscriptionListFixture,
  patientCreateSubscriptionFixture,
} from '../../../__tests__/fixtures/subscriptions.fixture.js';

// Mock the subscriptions service
vi.mock('../subscriptions.service.js', () => ({
  getSubscriptions: vi.fn(),
  getSubscription: vi.fn(),
  createSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  deleteSubscription: vi.fn(),
  pauseSubscription: vi.fn(),
  resumeSubscription: vi.fn(),
  createDefaultSubscriptions: vi.fn(),
  getSubscriptionHistory: vi.fn(),
  resendSubscription: vi.fn(),
}));

import * as subscriptionsService from '../subscriptions.service.js';

describe('SubscriptionsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return all subscriptions', async () => {
      vi.mocked(subscriptionsService.getSubscriptions).mockResolvedValue(subscriptionListFixture);

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await subscriptionsController.list(req, res, next);

      expect(subscriptionsService.getSubscriptions).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalled();
      expect(res._json).toMatchObject({
        success: true,
        count: subscriptionListFixture.length,
      });
    });

    it('should call next with error on failure', async () => {
      vi.mocked(subscriptionsService.getSubscriptions).mockRejectedValue(
        new Error('Database error')
      );

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await subscriptionsController.list(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next._error).toBeDefined();
    });
  });

  describe('getById', () => {
    it('should return a subscription by ID', async () => {
      vi.mocked(subscriptionsService.getSubscription).mockResolvedValue(
        patientCreateSubscriptionFixture
      );

      const req = createMockRequest({
        params: { id: 'patient-create-subscription' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await subscriptionsController.getById(req, res, next);

      expect(subscriptionsService.getSubscription).toHaveBeenCalledWith(
        'patient-create-subscription'
      );
      expect(res._json).toMatchObject({
        success: true,
        data: patientCreateSubscriptionFixture,
      });
    });

    it('should call next with 404 error when subscription not found', async () => {
      vi.mocked(subscriptionsService.getSubscription).mockResolvedValue(undefined);

      const req = createMockRequest({
        params: { id: 'non-existent' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await subscriptionsController.getById(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(next._error).toBeDefined();
    });
  });

  describe('create', () => {
    it('should create a new subscription', async () => {
      const newSubscription = { ...patientCreateSubscriptionFixture, id: 'new-subscription' };
      vi.mocked(subscriptionsService.createSubscription).mockResolvedValue(newSubscription);

      const req = createMockRequest({
        body: {
          name: 'New Patient Notifications',
          criteria: 'Patient',
          interaction: 'create',
        },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await subscriptionsController.create(req, res, next);

      expect(subscriptionsService.createSubscription).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res._json).toMatchObject({
        success: true,
        data: newSubscription,
      });
    });
  });

  describe('pause', () => {
    it('should pause an active subscription', async () => {
      const pausedSubscription = { ...patientCreateSubscriptionFixture, status: 'off' };
      vi.mocked(subscriptionsService.pauseSubscription).mockResolvedValue(pausedSubscription as any);

      const req = createMockRequest({
        params: { id: 'patient-create-subscription' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await subscriptionsController.pause(req, res, next);

      expect(subscriptionsService.pauseSubscription).toHaveBeenCalledWith(
        'patient-create-subscription'
      );
      expect(res._json).toMatchObject({
        success: true,
        data: pausedSubscription,
      });
    });
  });

  describe('resume', () => {
    it('should resume a paused subscription', async () => {
      const activeSubscription = { ...patientCreateSubscriptionFixture, status: 'active' };
      vi.mocked(subscriptionsService.resumeSubscription).mockResolvedValue(activeSubscription as any);

      const req = createMockRequest({
        params: { id: 'paused-subscription' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await subscriptionsController.resume(req, res, next);

      expect(subscriptionsService.resumeSubscription).toHaveBeenCalledWith('paused-subscription');
      expect(res._json).toMatchObject({
        success: true,
      });
    });
  });

  describe('delete', () => {
    it('should delete a subscription', async () => {
      vi.mocked(subscriptionsService.deleteSubscription).mockResolvedValue(undefined);

      const req = createMockRequest({
        params: { id: 'subscription-to-delete' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await subscriptionsController.delete(req, res, next);

      expect(subscriptionsService.deleteSubscription).toHaveBeenCalledWith('subscription-to-delete');
      expect(res._json).toMatchObject({
        success: true,
        message: 'Subscription deleted',
      });
    });
  });

  describe('createDefaults', () => {
    it('should create default subscriptions', async () => {
      vi.mocked(subscriptionsService.createDefaultSubscriptions).mockResolvedValue(
        subscriptionListFixture
      );

      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await subscriptionsController.createDefaults(req, res, next);

      expect(subscriptionsService.createDefaultSubscriptions).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res._json).toMatchObject({
        success: true,
        count: subscriptionListFixture.length,
      });
    });
  });
});
