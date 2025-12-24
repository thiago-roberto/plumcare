import { injectable, inject } from 'inversify';
import type { Request, Response } from 'express';
import { Controller } from '../../core/controller.js';
import { TYPES } from '../../core/di-tokens.js';
import { BadRequestError, NotFoundError } from '../../core/errors.js';
import type { EhrSystem } from '../../core/types/index.js';
import { PatientsService } from './patients.service.js';

@injectable()
export class PatientsController extends Controller {
  constructor(
    @inject(TYPES.PatientsService) private patientsService: PatientsService
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

    const result = await this.patientsService.getPatients(system, limit, offset);

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

    const patient = await this.patientsService.getPatient(system, id);

    if (!patient) {
      throw new NotFoundError({ message: `Patient not found: ${id}` });
    }

    return res.json({
      data: patient,
      system,
      source: 'medplum',
    });
  }

  async getObservations(req: Request, res: Response): Promise<Response> {
    const system = req.params.system as EhrSystem;
    const patientId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!this.isValidSystem(system)) {
      throw new BadRequestError({ message: `Invalid EHR system: ${system}` });
    }

    const result = await this.patientsService.getObservations(
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

  async getConditions(req: Request, res: Response): Promise<Response> {
    const system = req.params.system as EhrSystem;
    const patientId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!this.isValidSystem(system)) {
      throw new BadRequestError({ message: `Invalid EHR system: ${system}` });
    }

    const result = await this.patientsService.getConditions(
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

  async getDiagnosticReports(req: Request, res: Response): Promise<Response> {
    const system = req.params.system as EhrSystem;
    const patientId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!this.isValidSystem(system)) {
      throw new BadRequestError({ message: `Invalid EHR system: ${system}` });
    }

    const result = await this.patientsService.getDiagnosticReports(
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
