import { injectable, inject } from 'inversify';
import type { Patient, Observation, Condition, DiagnosticReport } from '@medplum/fhirtypes';
import { TYPES } from '../../core/di-tokens.js';
import type { EhrSystem, PaginatedResponse } from '../../core/types/index.js';
import { MedplumService } from '../medplum/medplum.service.js';

const EHR_SOURCE_SYSTEM = 'http://plumcare.io/ehr-source';

@injectable()
export class PatientsService {
  constructor(
    @inject(TYPES.MedplumService) private medplumService: MedplumService
  ) {}

  async getPatients(
    system: EhrSystem,
    limit = 10,
    offset = 0
  ): Promise<PaginatedResponse<Patient>> {
    const client = this.medplumService.client;

    const patients = await client.searchResources('Patient', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      _count: limit.toString(),
      _offset: offset.toString(),
      _sort: '-_lastUpdated',
    });

    const bundle = await client.search('Patient', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      _summary: 'count',
    });
    const total = bundle.total || patients.length;

    return {
      data: patients,
      total,
      limit,
      offset,
      hasMore: offset + patients.length < total,
    };
  }

  async getPatient(system: EhrSystem, id: string): Promise<Patient | null> {
    const client = this.medplumService.client;

    let patient: Patient | undefined;

    try {
      patient = await client.readResource('Patient', id);
    } catch {
      const patients = await client.searchResources('Patient', {
        _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
        identifier: id,
      });
      patient = patients[0];
    }

    if (!patient) {
      return null;
    }

    const hasCorrectTag = patient.meta?.tag?.some(
      (t) => t.system === EHR_SOURCE_SYSTEM && t.code === system
    );

    if (!hasCorrectTag) {
      return null;
    }

    return patient;
  }

  async getObservations(
    system: EhrSystem,
    patientId: string,
    limit = 10,
    offset = 0
  ): Promise<PaginatedResponse<Observation>> {
    const client = this.medplumService.client;

    const observations = (await client.searchResources('Observation', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      subject: `Patient/${patientId}`,
      _count: limit.toString(),
      _offset: offset.toString(),
      _sort: '-_lastUpdated',
    })) as Observation[];

    const bundle = await client.search('Observation', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      subject: `Patient/${patientId}`,
      _summary: 'count',
    });
    const total = bundle.total || observations.length;

    return {
      data: observations,
      total,
      limit,
      offset,
      hasMore: offset + observations.length < total,
    };
  }

  async getConditions(
    system: EhrSystem,
    patientId: string,
    limit = 10,
    offset = 0
  ): Promise<PaginatedResponse<Condition>> {
    const client = this.medplumService.client;

    const conditions = (await client.searchResources('Condition', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      subject: `Patient/${patientId}`,
      _count: limit.toString(),
      _offset: offset.toString(),
      _sort: '-_lastUpdated',
    })) as Condition[];

    const bundle = await client.search('Condition', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      subject: `Patient/${patientId}`,
      _summary: 'count',
    });
    const total = bundle.total || conditions.length;

    return {
      data: conditions,
      total,
      limit,
      offset,
      hasMore: offset + conditions.length < total,
    };
  }

  async getDiagnosticReports(
    system: EhrSystem,
    patientId: string,
    limit = 10,
    offset = 0
  ): Promise<PaginatedResponse<DiagnosticReport>> {
    const client = this.medplumService.client;

    const reports = (await client.searchResources('DiagnosticReport', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      subject: `Patient/${patientId}`,
      _count: limit.toString(),
      _offset: offset.toString(),
      _sort: '-_lastUpdated',
    })) as DiagnosticReport[];

    const bundle = await client.search('DiagnosticReport', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      subject: `Patient/${patientId}`,
      _summary: 'count',
    });
    const total = bundle.total || reports.length;

    return {
      data: reports,
      total,
      limit,
      offset,
      hasMore: offset + reports.length < total,
    };
  }
}
