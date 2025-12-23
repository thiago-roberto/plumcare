import type { Request, Response, NextFunction } from 'express';
import type { Resource } from '@medplum/fhirtypes';
import {
  createWebhookEvent,
  processWebhookEvent,
  getWebhookEvents,
  getWebhookEventById,
} from './webhooks.service.js';
import { AppError } from '../../core/middleware/index.js';

/**
 * Webhooks Controller
 *
 * Handles HTTP request/response for webhook operations.
 * This is where Medplum sends notifications when subscriptions trigger.
 */
export class WebhooksController {
  /**
   * POST /api/webhooks/medplum
   * Main webhook endpoint for Medplum subscriptions
   */
  async handleMedplumWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const resource = req.body as Resource;

      if (!resource || !resource.resourceType) {
        res.status(400).json({
          success: false,
          error: 'Invalid webhook payload - missing resource',
        });
        return;
      }

      // Extract subscription ID from headers if available
      const subscriptionId = req.headers['x-medplum-subscription'] as string;

      // Create webhook event record
      const webhookEvent = await createWebhookEvent(resource, subscriptionId);

      // Process the webhook based on resource type
      await processWebhookEvent(webhookEvent);

      console.log(`Webhook received: ${resource.resourceType}/${resource.id}`);

      // Return 200 OK to acknowledge receipt
      res.status(200).json({
        success: true,
        message: 'Webhook processed',
        eventId: webhookEvent.id,
      });
    } catch (error) {
      console.error('Error processing webhook:', error);
      // Return 500 to trigger retry (if configured)
      res.status(500).json({
        success: false,
        error: 'Webhook processing failed',
      });
    }
  }

  /**
   * GET /api/webhooks/events
   * Get recent webhook events (for debugging/monitoring)
   */
  async listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const resourceType = req.query.resourceType as string;

      const { events, total } = await getWebhookEvents({ limit, resourceType });

      res.json({
        success: true,
        data: events,
        total,
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(500, 'Failed to fetch webhook events', 'WEBHOOK_EVENTS_FETCH_ERROR', error));
      }
    }
  }

  /**
   * GET /api/webhooks/events/:id
   * Get a specific webhook event
   */
  async getEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const event = await getWebhookEventById(req.params.id);

      if (!event) {
        res.status(404).json({
          success: false,
          error: 'Webhook event not found',
        });
        return;
      }

      res.json({
        success: true,
        data: event,
      });
    } catch (error) {
      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(500, 'Failed to fetch webhook event', 'WEBHOOK_EVENT_FETCH_ERROR', error));
      }
    }
  }
}

export const webhooksController = new WebhooksController();
