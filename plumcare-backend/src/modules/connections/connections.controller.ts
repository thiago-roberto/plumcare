import { injectable, inject } from 'inversify';
import type { Request, Response } from 'express';
import { Controller } from '../../core/controller.js';
import { TYPES } from '../../core/di-tokens.js';
import { BadRequestError } from '../../core/errors.js';
import type { EhrSystem } from '../../core/types/index.js';
import { ConnectionsService } from './connections.service.js';

@injectable()
export class ConnectionsController extends Controller {
  constructor(
    @inject(TYPES.ConnectionsService) private connectionsService: ConnectionsService
  ) {
    super();
  }

  async getAll(_req: Request, res: Response): Promise<Response> {
    const connections = await this.connectionsService.getAllConnections();
    return res.json({
      connections,
      total: connections.length,
    });
  }

  async getOne(req: Request, res: Response): Promise<Response> {
    const system = req.params.system as EhrSystem;

    if (!this.isValidSystem(system)) {
      throw new BadRequestError({ message: `Invalid EHR system: ${system}` });
    }

    const connection = await this.connectionsService.getConnection(system);
    return res.json(connection);
  }

  async test(req: Request, res: Response): Promise<Response> {
    const system = req.params.system as EhrSystem;

    if (!this.isValidSystem(system)) {
      throw new BadRequestError({ message: `Invalid EHR system: ${system}` });
    }

    const result = await this.connectionsService.testConnection(system);
    return res.json({
      success: result.success,
      system,
      message: 'Connection test successful',
      expiresAt: result.expiresAt,
    });
  }

  private isValidSystem(system: string): system is EhrSystem {
    return ['athena', 'elation', 'nextgen'].includes(system);
  }
}
