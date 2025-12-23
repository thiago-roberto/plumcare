import { Router } from 'express';
import { subscriptionsController } from './subscriptions.controller.js';
import { validateRequest } from '../../core/middleware/index.js';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  SubscriptionIdParamDto,
  ResendSubscriptionDto,
} from './subscriptions.dto.js';

const router = Router();

/**
 * GET /api/subscriptions
 * List all subscriptions
 */
router.get('/', subscriptionsController.list.bind(subscriptionsController));

/**
 * POST /api/subscriptions
 * Create a new subscription
 */
router.post(
  '/',
  validateRequest({ body: CreateSubscriptionDto }),
  subscriptionsController.create.bind(subscriptionsController)
);

/**
 * POST /api/subscriptions/defaults
 * Create default subscriptions for common use cases
 */
router.post('/defaults', subscriptionsController.createDefaults.bind(subscriptionsController));

/**
 * GET /api/subscriptions/:id
 * Get a specific subscription
 */
router.get(
  '/:id',
  validateRequest({ params: SubscriptionIdParamDto }),
  subscriptionsController.getById.bind(subscriptionsController)
);

/**
 * PUT /api/subscriptions/:id
 * Update a subscription
 */
router.put(
  '/:id',
  validateRequest({ params: SubscriptionIdParamDto, body: UpdateSubscriptionDto }),
  subscriptionsController.update.bind(subscriptionsController)
);

/**
 * DELETE /api/subscriptions/:id
 * Delete a subscription
 */
router.delete(
  '/:id',
  validateRequest({ params: SubscriptionIdParamDto }),
  subscriptionsController.delete.bind(subscriptionsController)
);

/**
 * POST /api/subscriptions/:id/pause
 * Pause a subscription
 */
router.post(
  '/:id/pause',
  validateRequest({ params: SubscriptionIdParamDto }),
  subscriptionsController.pause.bind(subscriptionsController)
);

/**
 * POST /api/subscriptions/:id/resume
 * Resume a paused subscription
 */
router.post(
  '/:id/resume',
  validateRequest({ params: SubscriptionIdParamDto }),
  subscriptionsController.resume.bind(subscriptionsController)
);

/**
 * GET /api/subscriptions/:id/history
 * Get execution history for a subscription
 */
router.get(
  '/:id/history',
  validateRequest({ params: SubscriptionIdParamDto }),
  subscriptionsController.getHistory.bind(subscriptionsController)
);

/**
 * POST /api/subscriptions/:id/resend
 * Manually trigger a subscription for a specific resource
 */
router.post(
  '/:id/resend',
  validateRequest({ params: SubscriptionIdParamDto, body: ResendSubscriptionDto }),
  subscriptionsController.resend.bind(subscriptionsController)
);

export { router as subscriptionsRouter };
