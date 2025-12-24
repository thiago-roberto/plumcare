import { injectable, inject } from 'inversify';
import type { Request, Response } from 'express';
import { Controller } from '../../core/controller.js';
import { TYPES } from '../../core/di-tokens.js';
import { SubscriptionsService, type SubscriptionConfig } from './subscriptions.service.js';

@injectable()
export class SubscriptionsController extends Controller {
  constructor(
    @inject(TYPES.SubscriptionsService) private subscriptionsService: SubscriptionsService
  ) {
    super();
  }

  async getAll(_req: Request, res: Response): Promise<Response> {
    const subscriptions = await this.subscriptionsService.getSubscriptions();
    return res.json({ data: subscriptions });
  }

  async getOne(req: Request, res: Response): Promise<Response> {
    const subscription = await this.subscriptionsService.getSubscription(req.params.id);
    return res.json({ data: subscription });
  }

  async create(req: Request, res: Response): Promise<Response> {
    const config: SubscriptionConfig = req.body;
    const subscription = await this.subscriptionsService.createSubscription(config);
    return res.status(201).json({ data: subscription });
  }

  async createDefaults(_req: Request, res: Response): Promise<Response> {
    const subscriptions = await this.subscriptionsService.createDefaultSubscriptions();
    return res.status(201).json({ data: subscriptions });
  }

  async pause(req: Request, res: Response): Promise<Response> {
    const subscription = await this.subscriptionsService.pauseSubscription(req.params.id);
    return res.json({ data: subscription });
  }

  async resume(req: Request, res: Response): Promise<Response> {
    const subscription = await this.subscriptionsService.resumeSubscription(req.params.id);
    return res.json({ data: subscription });
  }

  async delete(req: Request, res: Response): Promise<Response> {
    await this.subscriptionsService.deleteSubscription(req.params.id);
    return res.status(204).send();
  }
}
