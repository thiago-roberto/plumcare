import { injectable, inject } from 'inversify';
import type { Request, Response } from 'express';
import type { Resource } from '@medplum/fhirtypes';
import { Controller } from '../../core/controller.js';
import { TYPES } from '../../core/di-tokens.js';
import { WebhooksService } from './webhooks.service.js';

@injectable()
export class WebhooksController extends Controller {
  constructor(
    @inject(TYPES.WebhooksService) private webhooksService: WebhooksService
  ) {
    super();
  }

  async getEvents(req: Request, res: Response): Promise<Response> {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const events = await this.webhooksService.getEvents(limit);
    return res.json({ data: events });
  }

  async handleMedplumWebhook(req: Request, res: Response): Promise<Response> {
    const resource = req.body as Resource;

    if (!resource || !resource.resourceType) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    const event = await this.webhooksService.processMedplumWebhook(resource);

    if (event) {
      return res.status(200).json({ success: true, eventId: event.id });
    }

    return res.status(500).json({ error: 'Failed to process webhook' });
  }

  async getUnprocessed(req: Request, res: Response): Promise<Response> {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const events = await this.webhooksService.getUnprocessedEvents(limit);
    return res.json({ data: events });
  }

  async reprocess(req: Request, res: Response): Promise<Response> {
    const event = await this.webhooksService.reprocessEvent(req.params.id);
    if (event) {
      return res.json({ data: event });
    }
    return res.status(404).json({ error: 'Event not found' });
  }

  async markProcessed(req: Request, res: Response): Promise<Response> {
    const event = await this.webhooksService.markAsProcessed(req.params.id);
    if (event) {
      return res.json({ data: event });
    }
    return res.status(404).json({ error: 'Event not found' });
  }
}
