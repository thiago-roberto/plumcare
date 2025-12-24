import type {
  Patient,
  Encounter,
  Observation,
  DiagnosticReport,
  Condition,
  Bundle,
  BundleEntry,
} from '@medplum/fhirtypes';
import { v4 as uuidv4 } from 'uuid';
import type { HL7v2Message } from '../generators/hl7v2.generator.js';

// HL7v2 segment and field parsing utilities
interface HL7v2Segment {
  name: string;
  fields: string[];
}

interface ParsedHL7v2Message {
  segments: HL7v2Segment[];
  msh: HL7v2Segment | null;
  pid: HL7v2Segment | null;
  pv1: HL7v2Segment | null;
  obr: HL7v2Segment[];
  obx: HL7v2Segment[];
  dg1: HL7v2Segment[];
  evn: HL7v2Segment | null;
}

const FIELD_SEPARATOR = '|';
const COMPONENT_SEPARATOR = '^';

function parseHL7v2Raw(raw: string): ParsedHL7v2Message {
  const lines = raw.split(/[\r\n]+/).filter(line => line.trim());
  const segments: HL7v2Segment[] = [];

  for (const line of lines) {
    const fields = line.split(FIELD_SEPARATOR);
    const segmentName = fields[0];

    // MSH is special - first field is the field separator itself
    if (segmentName === 'MSH') {
      segments.push({
        name: 'MSH',
        fields: ['MSH', FIELD_SEPARATOR, ...fields.slice(1)],
      });
    } else {
      segments.push({
        name: segmentName,
        fields,
      });
    }
  }

  return {
    segments,
    msh: segments.find(s => s.name === 'MSH') || null,
    pid: segments.find(s => s.name === 'PID') || null,
    pv1: segments.find(s => s.name === 'PV1') || null,
    obr: segments.filter(s => s.name === 'OBR'),
    obx: segments.filter(s => s.name === 'OBX'),
    dg1: segments.filter(s => s.name === 'DG1'),
    evn: segments.find(s => s.name === 'EVN') || null,
  };
}

function getField(segment: HL7v2Segment | null, index: number): string {
  if (!segment || index >= segment.fields.length) return '';
  return segment.fields[index] || '';
}

function getComponent(field: string, index: number): string {
  const components = field.split(COMPONENT_SEPARATOR);
  return components[index] || '';
}

function parseHL7Date(hl7Date: string): string | undefined {
  if (!hl7Date || hl7Date.length < 8) return undefined;

  const year = hl7Date.substring(0, 4);
  const month = hl7Date.substring(4, 6);
  const day = hl7Date.substring(6, 8);

  if (hl7Date.length >= 14) {
    const hour = hl7Date.substring(8, 10);
    const minute = hl7Date.substring(10, 12);
    const second = hl7Date.substring(12, 14);
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }

  return `${year}-${month}-${day}`;
}

function mapGender(hl7Gender: string): 'male' | 'female' | 'other' | 'unknown' {
  switch (hl7Gender.toUpperCase()) {
    case 'M': return 'male';
    case 'F': return 'female';
    case 'O': return 'other';
    default: return 'unknown';
  }
}

function mapEncounterClass(patientClass: string): { code: string; display: string } {
  const classMap: Record<string, { code: string; display: string }> = {
    'I': { code: 'IMP', display: 'inpatient encounter' },
    'O': { code: 'AMB', display: 'ambulatory' },
    'E': { code: 'EMER', display: 'emergency' },
    'P': { code: 'PRENC', display: 'pre-admission' },
  };
  return classMap[patientClass.toUpperCase()] || { code: 'AMB', display: 'ambulatory' };
}

function mapEncounterStatus(visitIndicator: string): 'planned' | 'arrived' | 'in-progress' | 'finished' | 'cancelled' {
  switch (visitIndicator.toUpperCase()) {
    case 'V': return 'finished';
    case 'A': return 'in-progress';
    default: return 'in-progress';
  }
}

function mapObservationInterpretation(flag: string): string {
  const interpretationMap: Record<string, string> = {
    'N': 'N',  // Normal
    'L': 'L',  // Low
    'H': 'H',  // High
    'LL': 'LL', // Critical low
    'HH': 'HH', // Critical high
    'A': 'A',  // Abnormal
  };
  return interpretationMap[flag.toUpperCase()] || 'N';
}

/**
 * Parse HL7v2 message and convert to FHIR Patient resource
 */
export function parseHL7v2ToPatient(message: HL7v2Message | string): Patient | null {
  const raw = typeof message === 'string' ? message : message.raw;
  const parsed = parseHL7v2Raw(raw);

  if (!parsed.pid) {
    return null;
  }

  const pid = parsed.pid;

  // PID-3: Patient Identifier List
  const patientIdField = getField(pid, 3);
  const mrn = getComponent(patientIdField, 0);
  const assigningAuthority = getComponent(patientIdField, 3);

  // PID-5: Patient Name
  const nameField = getField(pid, 5);
  const lastName = getComponent(nameField, 0);
  const firstName = getComponent(nameField, 1);
  const middleName = getComponent(nameField, 2);

  // PID-7: Date/Time of Birth
  const dob = parseHL7Date(getField(pid, 7));

  // PID-8: Administrative Sex
  const gender = mapGender(getField(pid, 8));

  // PID-11: Patient Address
  const addressField = getField(pid, 11);
  const street = getComponent(addressField, 0);
  const city = getComponent(addressField, 2);
  const state = getComponent(addressField, 3);
  const postalCode = getComponent(addressField, 4);
  const country = getComponent(addressField, 5);

  // PID-13: Phone Number - Home
  const phoneField = getField(pid, 13);
  const phone = getComponent(phoneField, 0);

  // PID-19: SSN
  const ssn = getField(pid, 19);

  // PID-10: Race
  const raceField = getField(pid, 10);
  const raceCode = getComponent(raceField, 0);
  const raceDisplay = getComponent(raceField, 1);

  // PID-22: Ethnic Group
  const ethnicityField = getField(pid, 22);
  const ethnicityCode = getComponent(ethnicityField, 0);
  const ethnicityDisplay = getComponent(ethnicityField, 1);

  const patient: Patient = {
    resourceType: 'Patient',
    id: uuidv4(),
    identifier: [
      {
        system: `urn:oid:${assigningAuthority || '2.16.840.1.113883.4.3'}`,
        value: mrn,
        type: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
            code: 'MR',
            display: 'Medical Record Number',
          }],
        },
      },
    ],
    name: [{
      use: 'official',
      family: lastName,
      given: [firstName, middleName].filter(Boolean),
    }],
    gender,
    birthDate: dob?.split('T')[0],
    telecom: [],
    address: [],
    extension: [],
  };

  // Add phone if present
  if (phone) {
    patient.telecom?.push({
      system: 'phone',
      value: phone,
      use: 'home',
    });
  }

  // Add SSN if present
  if (ssn) {
    patient.identifier?.push({
      system: 'http://hl7.org/fhir/sid/us-ssn',
      value: ssn,
    });
  }

  // Add address if present
  if (street || city || state || postalCode) {
    patient.address?.push({
      use: 'home',
      line: street ? [street] : undefined,
      city: city || undefined,
      state: state || undefined,
      postalCode: postalCode || undefined,
      country: country || undefined,
    });
  }

  // Add race extension
  if (raceCode) {
    patient.extension?.push({
      url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race',
      extension: [{
        url: 'ombCategory',
        valueCoding: {
          system: 'urn:oid:2.16.840.1.113883.6.238',
          code: raceCode,
          display: raceDisplay,
        },
      }],
    });
  }

  // Add ethnicity extension
  if (ethnicityCode) {
    patient.extension?.push({
      url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity',
      extension: [{
        url: 'ombCategory',
        valueCoding: {
          system: 'urn:oid:2.16.840.1.113883.6.238',
          code: ethnicityCode,
          display: ethnicityDisplay,
        },
      }],
    });
  }

  // Add meta for source tracking
  patient.meta = {
    lastUpdated: new Date().toISOString(),
    tag: [{
      system: 'http://plumcare.io/ehr-source',
      code: 'hl7v2',
      display: 'HL7 v2.x Message',
    }],
  };

  return patient;
}

/**
 * Parse HL7v2 ADT message and convert to FHIR Encounter resource
 */
export function parseHL7v2ToEncounter(message: HL7v2Message | string, patientReference?: string): Encounter | null {
  const raw = typeof message === 'string' ? message : message.raw;
  const parsed = parseHL7v2Raw(raw);

  if (!parsed.pv1) {
    return null;
  }

  const pv1 = parsed.pv1;

  // PV1-2: Patient Class
  const patientClass = getField(pv1, 2);
  const encounterClass = mapEncounterClass(patientClass);

  // PV1-3: Assigned Patient Location
  const locationField = getField(pv1, 3);
  const facilityName = getComponent(locationField, 0);
  const facilityId = getComponent(locationField, 3);

  // PV1-7: Attending Doctor
  const providerField = getField(pv1, 7);
  const providerId = getComponent(providerField, 0);
  const providerLastName = getComponent(providerField, 1);
  const providerFirstName = getComponent(providerField, 2);
  const providerNPI = getComponent(providerField, 8);

  // PV1-19: Visit Number
  const visitNumber = getField(pv1, 19);

  // PV1-44: Admit Date/Time
  const admitDateTime = parseHL7Date(getField(pv1, 44));

  // PV1-45: Discharge Date/Time
  const dischargeDateTime = parseHL7Date(getField(pv1, 45));

  // PV1-51: Visit Indicator
  const visitIndicator = getField(pv1, 51);
  const status = mapEncounterStatus(visitIndicator);

  const encounter: Encounter = {
    resourceType: 'Encounter',
    id: uuidv4(),
    identifier: [{
      system: 'http://plumcare.io/visit-number',
      value: visitNumber,
    }],
    status,
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: encounterClass.code,
      display: encounterClass.display,
    },
    subject: { reference: patientReference || 'Patient/unknown' },
    participant: [],
    period: {
      start: admitDateTime,
      end: dischargeDateTime,
    },
    serviceProvider: facilityName ? {
      display: facilityName,
      identifier: facilityId ? { value: facilityId } : undefined,
    } : undefined,
    meta: {
      lastUpdated: new Date().toISOString(),
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'hl7v2',
        display: 'HL7 v2.x Message',
      }],
    },
  };

  // Add attending provider
  if (providerId || providerLastName) {
    encounter.participant?.push({
      type: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
          code: 'ATND',
          display: 'attender',
        }],
      }],
      individual: {
        display: `${providerFirstName} ${providerLastName}`.trim(),
        identifier: providerNPI ? {
          system: 'http://hl7.org/fhir/sid/us-npi',
          value: providerNPI,
        } : undefined,
      },
    });
  }

  // Parse diagnoses from DG1 segments
  if (parsed.dg1.length > 0) {
    encounter.diagnosis = parsed.dg1.map(dg1 => {
      const diagnosisCodeField = getField(dg1, 3);
      const code = getComponent(diagnosisCodeField, 0);
      const display = getComponent(diagnosisCodeField, 1);
      const codeSystem = getComponent(diagnosisCodeField, 2);

      return {
        condition: {
          display,
        },
        use: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/diagnosis-role',
            code: 'AD',
            display: 'Admission diagnosis',
          }],
        },
      };
    });
  }

  return encounter;
}

/**
 * Parse HL7v2 ORU message and convert to FHIR Observations
 */
export function parseHL7v2ToObservations(message: HL7v2Message | string, patientReference?: string): Observation[] {
  const raw = typeof message === 'string' ? message : message.raw;
  const parsed = parseHL7v2Raw(raw);

  if (parsed.obx.length === 0) {
    return [];
  }

  return parsed.obx.map(obx => {
    // OBX-2: Value Type
    const valueType = getField(obx, 2);

    // OBX-3: Observation Identifier
    const identifierField = getField(obx, 3);
    const code = getComponent(identifierField, 0);
    const display = getComponent(identifierField, 1);
    const codeSystem = getComponent(identifierField, 2);

    // OBX-5: Observation Value
    const value = getField(obx, 5);

    // OBX-6: Units
    const units = getField(obx, 6);

    // OBX-7: Reference Range
    const referenceRange = getField(obx, 7);

    // OBX-8: Abnormal Flags
    const abnormalFlag = getField(obx, 8);

    // OBX-11: Observation Result Status
    const resultStatus = getField(obx, 11);

    // OBX-14: Date/Time of Observation
    const observationDateTime = parseHL7Date(getField(obx, 14));

    const observation: Observation = {
      resourceType: 'Observation',
      id: uuidv4(),
      status: resultStatus === 'F' ? 'final' : 'preliminary',
      code: {
        coding: [{
          system: codeSystem === 'LN' ? 'http://loinc.org' : `urn:oid:${codeSystem}`,
          code,
          display,
        }],
        text: display,
      },
      subject: { reference: patientReference || 'Patient/unknown' },
      effectiveDateTime: observationDateTime,
      issued: new Date().toISOString(),
      meta: {
        lastUpdated: new Date().toISOString(),
        tag: [{
          system: 'http://plumcare.io/ehr-source',
          code: 'hl7v2',
          display: 'HL7 v2.x Message',
        }],
      },
    };

    // Set value based on type
    if (valueType === 'NM' && value) {
      observation.valueQuantity = {
        value: parseFloat(value),
        unit: units,
        system: 'http://unitsofmeasure.org',
        code: units,
      };
    } else if (value) {
      observation.valueString = value;
    }

    // Add reference range
    if (referenceRange) {
      const rangeParts = referenceRange.split('-');
      if (rangeParts.length === 2) {
        observation.referenceRange = [{
          low: {
            value: parseFloat(rangeParts[0]),
            unit: units,
          },
          high: {
            value: parseFloat(rangeParts[1]),
            unit: units,
          },
        }];
      } else {
        observation.referenceRange = [{
          text: referenceRange,
        }];
      }
    }

    // Add interpretation
    if (abnormalFlag) {
      observation.interpretation = [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
          code: mapObservationInterpretation(abnormalFlag),
        }],
      }];
    }

    return observation;
  });
}

/**
 * Parse HL7v2 ORU message and convert to FHIR DiagnosticReport
 */
export function parseHL7v2ToDiagnosticReport(
  message: HL7v2Message | string,
  patientReference?: string
): DiagnosticReport | null {
  const raw = typeof message === 'string' ? message : message.raw;
  const parsed = parseHL7v2Raw(raw);

  if (parsed.obr.length === 0) {
    return null;
  }

  const obr = parsed.obr[0];

  // OBR-2: Placer Order Number
  const placerOrderNumber = getField(obr, 2);

  // OBR-3: Filler Order Number
  const fillerOrderNumber = getField(obr, 3);

  // OBR-4: Universal Service Identifier
  const serviceIdField = getField(obr, 4);
  const serviceCode = getComponent(serviceIdField, 0);
  const serviceName = getComponent(serviceIdField, 1);

  // OBR-7: Observation Date/Time
  const observationDateTime = parseHL7Date(getField(obr, 7));

  // OBR-22: Results Report Date/Time
  const resultsDateTime = parseHL7Date(getField(obr, 22));

  // OBR-25: Result Status
  const resultStatus = getField(obr, 25);

  // Parse observations
  const observations = parseHL7v2ToObservations(message, patientReference);

  const diagnosticReport: DiagnosticReport = {
    resourceType: 'DiagnosticReport',
    id: uuidv4(),
    identifier: [
      {
        system: 'http://plumcare.io/placer-order',
        value: placerOrderNumber,
      },
      {
        system: 'http://plumcare.io/filler-order',
        value: fillerOrderNumber,
      },
    ],
    status: resultStatus === 'F' ? 'final' : 'preliminary',
    code: {
      coding: [{
        system: 'http://loinc.org',
        code: serviceCode,
        display: serviceName,
      }],
      text: serviceName,
    },
    subject: { reference: patientReference || 'Patient/unknown' },
    effectiveDateTime: observationDateTime,
    issued: resultsDateTime,
    result: observations.map(obs => ({
      reference: `Observation/${obs.id}`,
      display: obs.code?.text,
    })),
    meta: {
      lastUpdated: new Date().toISOString(),
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'hl7v2',
        display: 'HL7 v2.x Message',
      }],
    },
  };

  return diagnosticReport;
}

/**
 * Parse HL7v2 message to FHIR Conditions from DG1 segments
 */
export function parseHL7v2ToConditions(message: HL7v2Message | string, patientReference?: string): Condition[] {
  const raw = typeof message === 'string' ? message : message.raw;
  const parsed = parseHL7v2Raw(raw);

  if (parsed.dg1.length === 0) {
    return [];
  }

  return parsed.dg1.map(dg1 => {
    // DG1-3: Diagnosis Code
    const diagnosisCodeField = getField(dg1, 3);
    const code = getComponent(diagnosisCodeField, 0);
    const display = getComponent(diagnosisCodeField, 1);
    const codeSystem = getComponent(diagnosisCodeField, 2);

    // DG1-5: Diagnosis Date/Time
    const diagnosisDateTime = parseHL7Date(getField(dg1, 5));

    // DG1-6: Diagnosis Type
    const diagnosisType = getField(dg1, 6);

    const condition: Condition = {
      resourceType: 'Condition',
      id: uuidv4(),
      clinicalStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'active',
          display: 'Active',
        }],
      },
      verificationStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'confirmed',
          display: 'Confirmed',
        }],
      },
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-category',
          code: diagnosisType === 'A' ? 'encounter-diagnosis' : 'problem-list-item',
          display: diagnosisType === 'A' ? 'Encounter Diagnosis' : 'Problem List Item',
        }],
      }],
      code: {
        coding: [{
          system: codeSystem === 'ICD10' ? 'http://hl7.org/fhir/sid/icd-10-cm' : `urn:oid:${codeSystem}`,
          code,
          display,
        }],
        text: display,
      },
      subject: { reference: patientReference || 'Patient/unknown' },
      onsetDateTime: diagnosisDateTime,
      recordedDate: new Date().toISOString(),
      meta: {
        lastUpdated: new Date().toISOString(),
        tag: [{
          system: 'http://plumcare.io/ehr-source',
          code: 'hl7v2',
          display: 'HL7 v2.x Message',
        }],
      },
    };

    return condition;
  });
}

/**
 * Parse complete HL7v2 message to FHIR Bundle
 */
export function parseHL7v2ToFhir(message: HL7v2Message | string): Bundle {
  const entries: BundleEntry[] = [];

  // Parse patient
  const patient = parseHL7v2ToPatient(message);
  if (patient) {
    entries.push({
      fullUrl: `urn:uuid:${patient.id}`,
      resource: patient,
      request: {
        method: 'POST',
        url: 'Patient',
      },
    });
  }

  const patientReference = patient ? `Patient/${patient.id}` : undefined;

  // Parse encounter (for ADT messages)
  const encounter = parseHL7v2ToEncounter(message, patientReference);
  if (encounter) {
    entries.push({
      fullUrl: `urn:uuid:${encounter.id}`,
      resource: encounter,
      request: {
        method: 'POST',
        url: 'Encounter',
      },
    });
  }

  // Parse conditions from DG1 segments
  const conditions = parseHL7v2ToConditions(message, patientReference);
  for (const condition of conditions) {
    entries.push({
      fullUrl: `urn:uuid:${condition.id}`,
      resource: condition,
      request: {
        method: 'POST',
        url: 'Condition',
      },
    });
  }

  // Parse observations (for ORU messages)
  const observations = parseHL7v2ToObservations(message, patientReference);
  for (const observation of observations) {
    entries.push({
      fullUrl: `urn:uuid:${observation.id}`,
      resource: observation,
      request: {
        method: 'POST',
        url: 'Observation',
      },
    });
  }

  // Parse diagnostic report (for ORU messages)
  const diagnosticReport = parseHL7v2ToDiagnosticReport(message, patientReference);
  if (diagnosticReport) {
    entries.push({
      fullUrl: `urn:uuid:${diagnosticReport.id}`,
      resource: diagnosticReport,
      request: {
        method: 'POST',
        url: 'DiagnosticReport',
      },
    });
  }

  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: entries,
  };
}
