import { injectable, inject } from 'inversify';
import type { Request, Response } from 'express';
import { Controller } from '../../core/controller.js';
import { TYPES } from '../../core/di-tokens.js';
import { BadRequestError } from '../../core/errors.js';
import type { EhrSystem } from '../../core/types/index.js';
import { SyncService } from './sync.service.js';

@injectable()
export class SyncController extends Controller {
  constructor(
    @inject(TYPES.SyncService) private syncService: SyncService
  ) {
    super();
  }

  async getEvents(req: Request, res: Response): Promise<Response> {
    const system = req.query.system as EhrSystem | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

    if (system && !this.isValidSystem(system)) {
      throw new BadRequestError({ message: `Invalid EHR system: ${system}` });
    }

    const result = await this.syncService.getSyncEvents({ system, limit, offset });
    return res.json(result);
  }

  async triggerSync(req: Request, res: Response): Promise<Response> {
    const system = req.params.system as EhrSystem;

    if (!this.isValidSystem(system)) {
      throw new BadRequestError({ message: `Invalid EHR system: ${system}` });
    }

    const result = await this.syncService.triggerSync(system);
    return res.json(result);
  }

  async syncMockData(req: Request, res: Response): Promise<Response> {
    const { patientCount, includeAllData } = req.body || {};

    const result = await this.syncService.syncMockData({
      patientCount,
      includeAllData,
    });

    return res.json(result);
  }

  private isValidSystem(system: string): system is EhrSystem {
    return ['athena', 'elation', 'nextgen'].includes(system);
  }
}
