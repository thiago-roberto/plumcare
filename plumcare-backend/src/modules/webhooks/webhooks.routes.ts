import { Router } from 'express';
import { webhooksController } from './webhooks.controller.js';
import { validateRequest, rateLimitPresets } from '../../core/middleware/index.js';
import { WebhookEventIdParamDto, WebhookEventsQueryDto } from './webhooks.dto.js';

const router = Router();

/**
 * POST /api/webhooks/medplum
 * Main webhook endpoint for Medplum subscriptions
 * Uses lenient rate limiting for internal Docker network requests
 */
router.post(
  '/medplum',
  rateLimitPresets.webhooks(),
  webhooksController.handleMedplumWebhook.bind(webhooksController)
);

/**
 * GET /api/webhooks/events
 * Get recent webhook events (for debugging/monitoring)
 */
router.get(
  '/events',
  validateRequest({ query: WebhookEventsQueryDto }),
  webhooksController.listEvents.bind(webhooksController)
);

/**
 * GET /api/webhooks/events/:id
 * Get a specific webhook event
 */
router.get(
  '/events/:id',
  validateRequest({ params: WebhookEventIdParamDto }),
  webhooksController.getEvent.bind(webhooksController)
);

export { router as webhooksRouter };
