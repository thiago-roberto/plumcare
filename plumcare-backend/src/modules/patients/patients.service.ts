import type { Patient, Observation, Condition, DiagnosticReport } from '@medplum/fhirtypes';
import { getMedplumClient } from '../../shared/medplum/index.js';
import { AppError } from '../../core/middleware/index.js';
import { EHR_SOURCE_SYSTEM, type EhrSystem } from './patients.types.js';

/**
 * Patients Service
 *
 * Handles patient-related queries to Medplum FHIR server.
 * All patients are tagged with their source EHR system.
 */

export interface PaginationParams {
  limit: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Get patients from Medplum filtered by EHR source
 */
export async function getPatients(
  system: EhrSystem,
  pagination: PaginationParams
): Promise<PaginatedResult<Patient>> {
  const client = getMedplumClient();
  const { limit, offset } = pagination;

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

/**
 * Get a specific patient by ID from Medplum
 */
export async function getPatientById(system: EhrSystem, id: string): Promise<Patient> {
  const client = getMedplumClient();

  let patient: Patient | undefined;

  // Try to get by ID first
  try {
    patient = await client.readResource('Patient', id);
  } catch {
    // If not found by ID, search by identifier
    const patients = await client.searchResources('Patient', {
      _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
      identifier: id,
    });
    patient = patients[0];
  }

  if (!patient) {
    throw new AppError(404, `Patient not found: ${id}`, 'PATIENT_NOT_FOUND');
  }

  // Verify the patient belongs to the requested EHR system
  const hasCorrectTag = patient.meta?.tag?.some(
    t => t.system === EHR_SOURCE_SYSTEM && t.code === system
  );

  if (!hasCorrectTag) {
    throw new AppError(404, `Patient not found in ${system}: ${id}`, 'PATIENT_NOT_FOUND');
  }

  return patient;
}

/**
 * Get observations for a patient from Medplum
 */
export async function getPatientObservations(
  system: EhrSystem,
  patientId: string,
  pagination: PaginationParams
): Promise<PaginatedResult<Observation>> {
  const client = getMedplumClient();
  const { limit, offset } = pagination;

  const observations = await client.searchResources('Observation', {
    _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
    subject: `Patient/${patientId}`,
    _count: limit.toString(),
    _offset: offset.toString(),
    _sort: '-_lastUpdated',
  }) as Observation[];

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

/**
 * Get conditions for a patient from Medplum
 */
export async function getPatientConditions(
  system: EhrSystem,
  patientId: string,
  pagination: PaginationParams
): Promise<PaginatedResult<Condition>> {
  const client = getMedplumClient();
  const { limit, offset } = pagination;

  const conditions = await client.searchResources('Condition', {
    _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
    subject: `Patient/${patientId}`,
    _count: limit.toString(),
    _offset: offset.toString(),
    _sort: '-_lastUpdated',
  }) as Condition[];

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

/**
 * Get diagnostic reports for a patient from Medplum
 */
export async function getPatientDiagnosticReports(
  system: EhrSystem,
  patientId: string,
  pagination: PaginationParams
): Promise<PaginatedResult<DiagnosticReport>> {
  const client = getMedplumClient();
  const { limit, offset } = pagination;

  const reports = await client.searchResources('DiagnosticReport', {
    _tag: `${EHR_SOURCE_SYSTEM}|${system}`,
    subject: `Patient/${patientId}`,
    _count: limit.toString(),
    _offset: offset.toString(),
    _sort: '-_lastUpdated',
  }) as DiagnosticReport[];

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
