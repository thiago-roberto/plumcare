import { describe, it, expect, beforeEach, vi } from 'vitest';
import { webhooksController } from '../webhooks.controller.js';
import {
  createMockRequest,
  createMockResponse,
  createMockNext,
} from '../../../__tests__/utils/test-helpers.js';
import type { Patient } from '@medplum/fhirtypes';

// Mock the webhooks service
vi.mock('../webhooks.service.js', () => ({
  createWebhookEvent: vi.fn().mockResolvedValue({
    id: 'webhook-test-123',
    timestamp: '2024-01-15T10:00:00Z',
    resourceType: 'Patient',
    resourceId: 'test-patient-001',
    action: 'create',
    payload: {},
    processed: false,
  }),
  processWebhookEvent: vi.fn().mockResolvedValue(undefined),
  getWebhookEvents: vi.fn().mockResolvedValue({
    events: [
      {
        id: 'webhook-1',
        timestamp: '2024-01-15T10:00:00Z',
        resourceType: 'Patient',
        resourceId: 'patient-1',
        action: 'create',
        processed: true,
      },
    ],
    total: 1,
  }),
  getWebhookEventById: vi.fn(),
}));

import * as webhooksService from '../webhooks.service.js';

describe('WebhooksController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('handleMedplumWebhook', () => {
    it('should process a valid webhook and return success', async () => {
      const patientPayload: Patient = {
        resourceType: 'Patient',
        id: 'test-patient-001',
        name: [{ family: 'Smith', given: ['John'] }],
      };

      const req = createMockRequest({
        body: patientPayload,
        headers: { 'x-medplum-subscription': 'sub-123' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await webhooksController.handleMedplumWebhook(req, res, next);

      expect(webhooksService.createWebhookEvent).toHaveBeenCalledWith(
        patientPayload,
        'sub-123'
      );
      expect(webhooksService.processWebhookEvent).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res._json).toMatchObject({
        success: true,
        message: 'Webhook processed',
        eventId: 'webhook-test-123',
      });
    });

    it('should return 400 for invalid payload without resourceType', async () => {
      const req = createMockRequest({
        body: { id: 'test' }, // Missing resourceType
      });
      const res = createMockResponse();
      const next = createMockNext();

      await webhooksController.handleMedplumWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res._json).toMatchObject({
        success: false,
        error: 'Invalid webhook payload - missing resource',
      });
    });

    it('should return 400 for empty body', async () => {
      const req = createMockRequest({
        body: null,
      });
      const res = createMockResponse();
      const next = createMockNext();

      await webhooksController.handleMedplumWebhook(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('listEvents', () => {
    it('should return webhook events with pagination', async () => {
      const req = createMockRequest({
        query: { limit: '10' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await webhooksController.listEvents(req, res, next);

      expect(webhooksService.getWebhookEvents).toHaveBeenCalledWith({
        limit: 10,
        resourceType: undefined,
      });
      expect(res.json).toHaveBeenCalled();
      expect(res._json).toMatchObject({
        success: true,
        total: 1,
      });
    });

    it('should filter by resourceType when provided', async () => {
      const req = createMockRequest({
        query: { limit: '20', resourceType: 'Patient' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await webhooksController.listEvents(req, res, next);

      expect(webhooksService.getWebhookEvents).toHaveBeenCalledWith({
        limit: 20,
        resourceType: 'Patient',
      });
    });
  });

  describe('getEvent', () => {
    it('should return a specific webhook event by ID', async () => {
      const mockEvent = {
        id: 'webhook-123',
        timestamp: '2024-01-15T10:00:00Z',
        resourceType: 'Patient',
        resourceId: 'patient-1',
        action: 'create',
        processed: true,
      };
      vi.mocked(webhooksService.getWebhookEventById).mockResolvedValue(mockEvent as any);

      const req = createMockRequest({
        params: { id: 'webhook-123' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await webhooksController.getEvent(req, res, next);

      expect(webhooksService.getWebhookEventById).toHaveBeenCalledWith('webhook-123');
      expect(res._json).toMatchObject({
        success: true,
        data: mockEvent,
      });
    });

    it('should return 404 when event not found', async () => {
      vi.mocked(webhooksService.getWebhookEventById).mockResolvedValue(undefined);

      const req = createMockRequest({
        params: { id: 'non-existent' },
      });
      const res = createMockResponse();
      const next = createMockNext();

      await webhooksController.getEvent(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res._json).toMatchObject({
        success: false,
        error: 'Webhook event not found',
      });
    });
  });
});
