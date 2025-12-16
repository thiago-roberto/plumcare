import { v4 as uuidv4 } from 'uuid';
import type { Patient, Encounter } from '@medplum/fhirtypes';
import type { EhrPatient, EhrEncounter, EhrSystem } from '../types/index.js';

/**
 * Transform EHR-native patient format to FHIR R4 Patient resource
 */
export function transformToFhirPatient(ehrPatient: EhrPatient): Patient {
  const patient: Patient = {
    resourceType: 'Patient',
    id: ehrPatient.id,
    identifier: [
      {
        system: `urn:${ehrPatient.sourceSystem}:patient`,
        value: ehrPatient.mrn,
      },
      {
        system: `urn:${ehrPatient.sourceSystem}:id`,
        value: ehrPatient.sourceId,
      },
    ],
    name: [
      {
        family: ehrPatient.lastName,
        given: ehrPatient.middleName
          ? [ehrPatient.firstName, ehrPatient.middleName]
          : [ehrPatient.firstName],
      },
    ],
    gender: ehrPatient.gender,
    birthDate: ehrPatient.dateOfBirth,
  };

  // Add telecom if available
  const telecom: Patient['telecom'] = [];
  if (ehrPatient.phone) {
    telecom.push({ system: 'phone', value: ehrPatient.phone, use: 'home' });
  }
  if (ehrPatient.email) {
    telecom.push({ system: 'email', value: ehrPatient.email });
  }
  if (telecom.length > 0) {
    patient.telecom = telecom;
  }

  // Add address if available
  if (ehrPatient.address) {
    patient.address = [
      {
        line: ehrPatient.address.street ? [ehrPatient.address.street] : undefined,
        city: ehrPatient.address.city,
        state: ehrPatient.address.state,
        postalCode: ehrPatient.address.postalCode,
        country: ehrPatient.address.country,
      },
    ];
  }

  // Add meta with source system tag
  patient.meta = {
    lastUpdated: ehrPatient.lastUpdated,
    tag: [
      {
        system: 'http://plumcare.io/ehr-source',
        code: ehrPatient.sourceSystem,
        display: getSystemDisplayName(ehrPatient.sourceSystem),
      },
    ],
  };

  return patient;
}

/**
 * Transform EHR-native encounter format to FHIR R4 Encounter resource
 */
export function transformToFhirEncounter(ehrEncounter: EhrEncounter): Encounter {
  const encounter: Encounter = {
    resourceType: 'Encounter',
    id: ehrEncounter.id,
    identifier: [
      {
        system: `urn:${ehrEncounter.sourceSystem}:encounter`,
        value: ehrEncounter.sourceId,
      },
    ],
    status: mapEncounterStatus(ehrEncounter.status),
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: mapEncounterClass(ehrEncounter.type),
      display: mapEncounterClassDisplay(ehrEncounter.type),
    },
    type: [
      {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '185349003',
            display: 'Office visit',
          },
        ],
        text: ehrEncounter.type,
      },
    ],
    subject: {
      reference: `Patient/${ehrEncounter.patientId}`,
    },
    period: {
      start: ehrEncounter.startTime,
      end: ehrEncounter.endTime,
    },
  };

  // Add reason if available
  if (ehrEncounter.reason) {
    encounter.reasonCode = [{ text: ehrEncounter.reason }];
  }

  // Add participant (provider) if available
  if (ehrEncounter.provider) {
    encounter.participant = [
      {
        individual: {
          reference: `Practitioner/${ehrEncounter.provider.id}`,
          display: ehrEncounter.provider.name,
        },
      },
    ];
  }

  // Add location (facility) if available
  if (ehrEncounter.facility) {
    encounter.location = [
      {
        location: {
          reference: `Location/${ehrEncounter.facility.id}`,
          display: ehrEncounter.facility.name,
        },
      },
    ];
  }

  // Add meta with source system tag
  encounter.meta = {
    lastUpdated: ehrEncounter.lastUpdated,
    tag: [
      {
        system: 'http://plumcare.io/ehr-source',
        code: ehrEncounter.sourceSystem,
        display: getSystemDisplayName(ehrEncounter.sourceSystem),
      },
    ],
  };

  return encounter;
}

/**
 * Batch transform multiple patients
 */
export function transformPatientsBatch(ehrPatients: EhrPatient[]): Patient[] {
  return ehrPatients.map(transformToFhirPatient);
}

/**
 * Batch transform multiple encounters
 */
export function transformEncountersBatch(ehrEncounters: EhrEncounter[]): Encounter[] {
  return ehrEncounters.map(transformToFhirEncounter);
}

// Helper functions
function getSystemDisplayName(system: EhrSystem): string {
  const names: Record<EhrSystem, string> = {
    athena: 'Athena Health',
    elation: 'Elation Health',
    nextgen: 'NextGen Healthcare',
  };
  return names[system];
}

function mapEncounterStatus(status: EhrEncounter['status']): Encounter['status'] {
  const statusMap: Record<EhrEncounter['status'], Encounter['status']> = {
    planned: 'planned',
    arrived: 'arrived',
    'in-progress': 'in-progress',
    finished: 'finished',
    cancelled: 'cancelled',
  };
  return statusMap[status] || 'unknown';
}

function mapEncounterClass(type: string): string {
  const typeUpper = type.toUpperCase();
  if (typeUpper.includes('TELEHEALTH') || typeUpper.includes('VIRTUAL')) {
    return 'VR';
  }
  if (typeUpper.includes('EMERGENCY') || typeUpper.includes('ER')) {
    return 'EMER';
  }
  if (typeUpper.includes('INPATIENT') || typeUpper.includes('HOSPITAL')) {
    return 'IMP';
  }
  if (typeUpper.includes('HOME')) {
    return 'HH';
  }
  return 'AMB'; // Default to ambulatory
}

function mapEncounterClassDisplay(type: string): string {
  const code = mapEncounterClass(type);
  const displays: Record<string, string> = {
    AMB: 'ambulatory',
    VR: 'virtual',
    EMER: 'emergency',
    IMP: 'inpatient',
    HH: 'home health',
  };
  return displays[code] || 'ambulatory';
}

/**
 * Generate a unique FHIR identifier for new resources
 */
export function generateFhirId(system: EhrSystem, resourceType: string): string {
  return `${system}-${resourceType.toLowerCase()}-${uuidv4().slice(0, 8)}`;
}
