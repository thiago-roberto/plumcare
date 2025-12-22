import { Router } from 'express';
import {
  createSubscription,
  getSubscriptions,
  getSubscription,
  updateSubscription,
  deleteSubscription,
  pauseSubscription,
  resumeSubscription,
  createDefaultSubscriptions,
  getSubscriptionHistory,
  resendSubscription,
  type SubscriptionConfig,
} from '../services/subscription.service.js';

const router = Router();

/**
 * GET /api/subscriptions
 * List all subscriptions
 */
router.get('/', async (_req, res) => {
  try {
    const subscriptions = await getSubscriptions();
    res.json({
      success: true,
      data: subscriptions,
      count: subscriptions.length,
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscriptions',
    });
  }
});

/**
 * POST /api/subscriptions
 * Create a new subscription
 *
 * Body: {
 *   name: string,
 *   criteria: string (e.g., 'Patient', 'Encounter'),
 *   interaction?: 'create' | 'update' | 'delete',
 *   endpoint?: string,
 *   fhirPathFilter?: string,
 *   maxAttempts?: number
 * }
 */
router.post('/', async (req, res) => {
  try {
    const config: SubscriptionConfig = req.body;

    if (!config.name || !config.criteria) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name and criteria',
      });
    }

    const subscription = await createSubscription(config);
    res.status(201).json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription',
    });
  }
});

/**
 * POST /api/subscriptions/defaults
 * Create default subscriptions for common use cases
 */
router.post('/defaults', async (_req, res) => {
  try {
    const subscriptions = await createDefaultSubscriptions();
    res.status(201).json({
      success: true,
      data: subscriptions,
      count: subscriptions.length,
    });
  } catch (error) {
    console.error('Error creating default subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create default subscriptions',
    });
  }
});

/**
 * GET /api/subscriptions/:id
 * Get a specific subscription
 */
router.get('/:id', async (req, res) => {
  try {
    const subscription = await getSubscription(req.params.id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
      });
    }

    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription',
    });
  }
});

/**
 * PUT /api/subscriptions/:id
 * Update a subscription
 */
router.put('/:id', async (req, res) => {
  try {
    const subscription = await updateSubscription(req.params.id, req.body);
    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update subscription',
    });
  }
});

/**
 * DELETE /api/subscriptions/:id
 * Delete a subscription
 */
router.delete('/:id', async (req, res) => {
  try {
    await deleteSubscription(req.params.id);
    res.json({
      success: true,
      message: 'Subscription deleted',
    });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete subscription',
    });
  }
});

/**
 * POST /api/subscriptions/:id/pause
 * Pause a subscription
 */
router.post('/:id/pause', async (req, res) => {
  try {
    const subscription = await pauseSubscription(req.params.id);
    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('Error pausing subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to pause subscription',
    });
  }
});

/**
 * POST /api/subscriptions/:id/resume
 * Resume a paused subscription
 */
router.post('/:id/resume', async (req, res) => {
  try {
    const subscription = await resumeSubscription(req.params.id);
    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    console.error('Error resuming subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resume subscription',
    });
  }
});

/**
 * GET /api/subscriptions/:id/history
 * Get execution history for a subscription
 */
router.get('/:id/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const history = await getSubscriptionHistory(req.params.id, limit);
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error fetching subscription history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subscription history',
    });
  }
});

/**
 * POST /api/subscriptions/:id/resend
 * Manually trigger a subscription for a specific resource
 *
 * Body: {
 *   resourceType: string,
 *   resourceId: string
 * }
 */
router.post('/:id/resend', async (req, res) => {
  try {
    const { resourceType, resourceId } = req.body;

    if (!resourceType || !resourceId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: resourceType and resourceId',
      });
    }

    await resendSubscription(req.params.id, resourceType, resourceId);
    res.json({
      success: true,
      message: 'Subscription resent successfully',
    });
  } catch (error) {
    console.error('Error resending subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend subscription',
    });
  }
});

export { router as subscriptionsRouter };
