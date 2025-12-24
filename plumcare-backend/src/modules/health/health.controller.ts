import { injectable } from 'inversify';
import type { Request, Response } from 'express';
import { Controller } from '../../core/controller.js';

@injectable()
export class HealthController extends Controller {
  async check(_req: Request, res: Response): Promise<Response> {
    return res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
  }
}
