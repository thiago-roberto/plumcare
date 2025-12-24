import { injectable, inject } from 'inversify';
import type { Request, Response } from 'express';
import { Controller } from '../../core/controller.js';
import { TYPES } from '../../core/di-tokens.js';
import { BadRequestError, NotFoundError } from '../../core/errors.js';
import type { EhrSystem } from '../../core/types/index.js';
import { EncountersService } from './encounters.service.js';

@injectable()
export class EncountersController extends Controller {
  constructor(
    @inject(TYPES.EncountersService) private encountersService: EncountersService
  ) {
    super();
  }

  async getAll(req: Request, res: Response): Promise<Response> {
    const system = req.params.system as EhrSystem;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!this.isValidSystem(system)) {
      throw new BadRequestError({ message: `Invalid EHR system: ${system}` });
    }

    const result = await this.encountersService.getEncounters(system, limit, offset);

    return res.json({
      ...result,
      system,
      source: 'medplum',
    });
  }

  async getOne(req: Request, res: Response): Promise<Response> {
    const system = req.params.system as EhrSystem;
    const id = req.params.id;

    if (!this.isValidSystem(system)) {
      throw new BadRequestError({ message: `Invalid EHR system: ${system}` });
    }

    const encounter = await this.encountersService.getEncounter(system, id);

    if (!encounter) {
      throw new NotFoundError({ message: `Encounter not found: ${id}` });
    }

    return res.json({
      data: encounter,
      system,
      source: 'medplum',
    });
  }

  async getByPatient(req: Request, res: Response): Promise<Response> {
    const system = req.params.system as EhrSystem;
    const patientId = req.params.patientId;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!this.isValidSystem(system)) {
      throw new BadRequestError({ message: `Invalid EHR system: ${system}` });
    }

    const result = await this.encountersService.getEncountersByPatient(
      system,
      patientId,
      limit,
      offset
    );

    return res.json({
      ...result,
      system,
      patientId,
      source: 'medplum',
    });
  }

  private isValidSystem(system: string): system is EhrSystem {
    return ['athena', 'elation', 'nextgen', 'medplum'].includes(system);
  }
}
