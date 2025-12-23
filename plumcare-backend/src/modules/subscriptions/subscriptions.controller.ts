import type { Request, Response, NextFunction } from 'express';
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
} from './subscriptions.service.js';
import { AppError } from '../../core/middleware/index.js';
import type { CreateSubscriptionDto, UpdateSubscriptionDto, ResendSubscriptionDto } from './subscriptions.dto.js';

/**
 * Subscriptions Controller
 *
 * Handles HTTP request/response for subscription management.
 * Delegates business logic to the subscriptions service.
 */
export class SubscriptionsController {
  /**
   * GET /api/subscriptions
   * List all subscriptions
   */
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriptions = await getSubscriptions();
      res.json({
        success: true,
        data: subscriptions,
        count: subscriptions.length,
      });
    } catch (error) {
      next(new AppError(500, 'Failed to fetch subscriptions', 'SUBSCRIPTIONS_FETCH_ERROR', error));
    }
  }

  /**
   * POST /api/subscriptions
   * Create a new subscription
   */
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as CreateSubscriptionDto;
      const subscription = await createSubscription(dto);
      res.status(201).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(new AppError(500, 'Failed to create subscription', 'SUBSCRIPTION_CREATE_ERROR', error));
    }
  }

  /**
   * POST /api/subscriptions/defaults
   * Create default subscriptions for common use cases
   */
  async createDefaults(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscriptions = await createDefaultSubscriptions();
      res.status(201).json({
        success: true,
        data: subscriptions,
        count: subscriptions.length,
      });
    } catch (error) {
      next(new AppError(500, 'Failed to create default subscriptions', 'SUBSCRIPTIONS_DEFAULTS_ERROR', error));
    }
  }

  /**
   * GET /api/subscriptions/:id
   * Get a specific subscription
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await getSubscription(req.params.id);

      if (!subscription) {
        throw new AppError(404, 'Subscription not found', 'SUBSCRIPTION_NOT_FOUND');
      }

      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(500, 'Failed to fetch subscription', 'SUBSCRIPTION_FETCH_ERROR', error));
      }
    }
  }

  /**
   * PUT /api/subscriptions/:id
   * Update a subscription
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as UpdateSubscriptionDto;
      const subscription = await updateSubscription(req.params.id, dto);
      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(new AppError(500, 'Failed to update subscription', 'SUBSCRIPTION_UPDATE_ERROR', error));
    }
  }

  /**
   * DELETE /api/subscriptions/:id
   * Delete a subscription
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await deleteSubscription(req.params.id);
      res.json({
        success: true,
        message: 'Subscription deleted',
      });
    } catch (error) {
      next(new AppError(500, 'Failed to delete subscription', 'SUBSCRIPTION_DELETE_ERROR', error));
    }
  }

  /**
   * POST /api/subscriptions/:id/pause
   * Pause a subscription
   */
  async pause(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await pauseSubscription(req.params.id);
      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(new AppError(500, 'Failed to pause subscription', 'SUBSCRIPTION_PAUSE_ERROR', error));
    }
  }

  /**
   * POST /api/subscriptions/:id/resume
   * Resume a paused subscription
   */
  async resume(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const subscription = await resumeSubscription(req.params.id);
      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(new AppError(500, 'Failed to resume subscription', 'SUBSCRIPTION_RESUME_ERROR', error));
    }
  }

  /**
   * GET /api/subscriptions/:id/history
   * Get execution history for a subscription
   */
  async getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const history = await getSubscriptionHistory(req.params.id, limit);
      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(new AppError(500, 'Failed to fetch subscription history', 'SUBSCRIPTION_HISTORY_ERROR', error));
    }
  }

  /**
   * POST /api/subscriptions/:id/resend
   * Manually trigger a subscription for a specific resource
   */
  async resend(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dto = req.body as ResendSubscriptionDto;
      await resendSubscription(req.params.id, dto.resourceType, dto.resourceId);
      res.json({
        success: true,
        message: 'Subscription resent successfully',
      });
    } catch (error) {
      next(new AppError(500, 'Failed to resend subscription', 'SUBSCRIPTION_RESEND_ERROR', error));
    }
  }
}

export const subscriptionsController = new SubscriptionsController();
