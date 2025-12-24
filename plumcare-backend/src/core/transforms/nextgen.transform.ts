import type {
  Patient,
  Encounter,
  Observation,
  Condition,
  AllergyIntolerance,
  MedicationStatement,
  DiagnosticReport,
  Bundle,
  BundleEntry,
} from '@medplum/fhirtypes';
import { v4 as uuidv4 } from 'uuid';
import type {
  NextGenPatient,
  NextGenEncounter,
  NextGenProblem,
  NextGenAllergy,
  NextGenMedication,
  NextGenLabOrder,
  NextGenVitals,
} from '../generators/nextgen.generator.js';

function mapNextGenGender(gender: string): 'male' | 'female' | 'other' | 'unknown' {
  switch (gender.toUpperCase()) {
    case 'M': return 'male';
    case 'F': return 'female';
    case 'O': return 'other';
    default: return 'unknown';
  }
}

function mapNextGenEncounterType(type: string): { code: string; display: string } {
  const typeMap: Record<string, { code: string; display: string }> = {
    'office visit': { code: 'AMB', display: 'ambulatory' },
    'telehealth': { code: 'VR', display: 'virtual' },
    'hospital visit': { code: 'IMP', display: 'inpatient encounter' },
    'emergency': { code: 'EMER', display: 'emergency' },
    'procedure': { code: 'AMB', display: 'ambulatory' },
    'consultation': { code: 'AMB', display: 'ambulatory' },
  };
  return typeMap[type.toLowerCase()] || { code: 'AMB', display: 'ambulatory' };
}

function mapNextGenEncounterStatus(status: string): 'planned' | 'arrived' | 'in-progress' | 'finished' | 'cancelled' {
  switch (status) {
    case 'Open': return 'in-progress';
    case 'Closed':
    case 'Billed': return 'finished';
    case 'Void': return 'cancelled';
    default: return 'in-progress';
  }
}

function mapNextGenProblemStatus(status: string): string {
  switch (status) {
    case 'Active':
    case 'Chronic': return 'active';
    case 'Resolved': return 'resolved';
    case 'Inactive': return 'inactive';
    default: return 'active';
  }
}

function mapNextGenAllergyStatus(status: string): string {
  switch (status) {
    case 'Active': return 'active';
    case 'Inactive': return 'inactive';
    case 'Entered in Error': return 'entered-in-error';
    default: return 'active';
  }
}

function mapNextGenMedicationStatus(status: string): 'active' | 'completed' | 'stopped' | 'on-hold' {
  switch (status) {
    case 'Active': return 'active';
    case 'Completed': return 'completed';
    case 'Discontinued': return 'stopped';
    case 'On Hold': return 'on-hold';
    default: return 'active';
  }
}

/**
 * Transform NextGen Patient to FHIR Patient
 */
export function parseNextGenPatientToFhir(nextGenPatient: NextGenPatient): Patient {
  const patient: Patient = {
    resourceType: 'Patient',
    id: uuidv4(),
    identifier: [
      {
        system: 'http://nextgen.com/person-id',
        value: nextGenPatient.person_id,
        type: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
            code: 'PI',
            display: 'Patient internal identifier',
          }],
        },
      },
      {
        system: 'http://nextgen.com/mrn',
        value: nextGenPatient.mrn,
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
      family: nextGenPatient.last_name,
      given: [nextGenPatient.first_name, nextGenPatient.middle_name].filter(Boolean) as string[],
    }],
    gender: mapNextGenGender(nextGenPatient.gender),
    birthDate: nextGenPatient.date_of_birth,
    telecom: [],
    address: [],
    extension: [],
    active: nextGenPatient.patient_status === 'Active',
    meta: {
      lastUpdated: nextGenPatient.modified_timestamp,
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'nextgen',
        display: 'NextGen Healthcare',
      }],
    },
  };

  // Add enterprise ID
  patient.identifier?.push({
    system: `http://nextgen.com/enterprise/${nextGenPatient.enterprise_id}`,
    value: nextGenPatient.person_id,
  });

  // Add SSN if present
  if (nextGenPatient.ssn) {
    patient.identifier?.push({
      system: 'http://hl7.org/fhir/sid/us-ssn',
      value: nextGenPatient.ssn,
    });
  }

  // Add preferred name
  if (nextGenPatient.preferred_name) {
    patient.name?.push({
      use: 'nickname',
      given: [nextGenPatient.preferred_name],
    });
  }

  // Add phones
  if (nextGenPatient.home_phone) {
    patient.telecom?.push({
      system: 'phone',
      value: nextGenPatient.home_phone,
      use: 'home',
    });
  }
  if (nextGenPatient.mobile_phone) {
    patient.telecom?.push({
      system: 'phone',
      value: nextGenPatient.mobile_phone,
      use: 'mobile',
    });
  }
  if (nextGenPatient.work_phone) {
    patient.telecom?.push({
      system: 'phone',
      value: nextGenPatient.work_phone,
      use: 'work',
    });
  }

  // Add email
  if (nextGenPatient.email_address) {
    patient.telecom?.push({
      system: 'email',
      value: nextGenPatient.email_address,
    });
  }

  // Add address
  if (nextGenPatient.address) {
    patient.address?.push({
      use: nextGenPatient.address.address_type === 'Home' ? 'home' :
           nextGenPatient.address.address_type === 'Work' ? 'work' : 'home',
      line: [nextGenPatient.address.address_line_1, nextGenPatient.address.address_line_2].filter(Boolean) as string[],
      city: nextGenPatient.address.city,
      state: nextGenPatient.address.state_code,
      postalCode: nextGenPatient.address.postal_code,
      country: nextGenPatient.address.country_code,
    });
  }

  // Add marital status
  if (nextGenPatient.marital_status_code) {
    patient.maritalStatus = {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
        code: nextGenPatient.marital_status_code.charAt(0).toUpperCase(),
        display: nextGenPatient.marital_status_code,
      }],
    };
  }

  // Add race extension
  if (nextGenPatient.race_code) {
    patient.extension?.push({
      url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race',
      extension: [{
        url: 'ombCategory',
        valueCoding: {
          system: 'urn:oid:2.16.840.1.113883.6.238',
          code: nextGenPatient.race_code,
        },
      }],
    });
  }

  // Add ethnicity extension
  if (nextGenPatient.ethnicity_code) {
    patient.extension?.push({
      url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity',
      extension: [{
        url: 'ombCategory',
        valueCoding: {
          system: 'urn:oid:2.16.840.1.113883.6.238',
          code: nextGenPatient.ethnicity_code,
        },
      }],
    });
  }

  // Add language
  if (nextGenPatient.preferred_language) {
    patient.communication = [{
      language: {
        coding: [{
          system: 'urn:ietf:bcp:47',
          code: nextGenPatient.preferred_language,
        }],
      },
      preferred: true,
    }];
  }

  return patient;
}

/**
 * Transform NextGen Encounter to FHIR Encounter
 */
export function parseNextGenEncounterToFhir(nextGenEncounter: NextGenEncounter, patientReference?: string): Encounter {
  const encounterClass = mapNextGenEncounterType(nextGenEncounter.encounter_type);

  const encounter: Encounter = {
    resourceType: 'Encounter',
    id: uuidv4(),
    identifier: [{
      system: 'http://nextgen.com/encounter-id',
      value: nextGenEncounter.encounter_id,
    }],
    status: mapNextGenEncounterStatus(nextGenEncounter.encounter_status),
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: encounterClass.code,
      display: encounterClass.display,
    },
    type: [{
      coding: [{
        system: 'http://nextgen.com/encounter-type',
        code: nextGenEncounter.encounter_type,
        display: nextGenEncounter.encounter_type,
      }],
    }],
    serviceType: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/service-type',
        code: nextGenEncounter.place_of_service_code,
        display: nextGenEncounter.service_location,
      }],
    },
    subject: { reference: patientReference || 'Patient/unknown' },
    participant: [{
      type: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
          code: 'ATND',
          display: 'attender',
        }],
      }],
      individual: {
        identifier: {
          system: 'http://nextgen.com/provider-id',
          value: nextGenEncounter.rendering_provider_id,
        },
      },
    }],
    period: {
      start: `${nextGenEncounter.encounter_date}T00:00:00`,
    },
    reasonCode: nextGenEncounter.chief_complaint ? [{
      text: nextGenEncounter.chief_complaint,
    }] : undefined,
    meta: {
      lastUpdated: nextGenEncounter.modified_timestamp,
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'nextgen',
        display: 'NextGen Healthcare',
      }],
    },
  };

  // Add diagnoses
  if (nextGenEncounter.diagnoses && nextGenEncounter.diagnoses.length > 0) {
    encounter.diagnosis = nextGenEncounter.diagnoses.map(diag => ({
      condition: {
        display: diag.description,
      },
      use: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/diagnosis-role',
          code: diag.diagnosis_type === 'Primary' ? 'AD' : 'DD',
          display: diag.diagnosis_type === 'Primary' ? 'Admission diagnosis' : 'Discharge diagnosis',
        }],
      },
      rank: diag.sequence_number,
    }));
  }

  return encounter;
}

/**
 * Transform NextGen Vitals to FHIR Observations
 */
export function parseNextGenVitalsToFhir(vitals: NextGenVitals, patientReference?: string): Observation[] {
  const observations: Observation[] = [];
  const dateTime = vitals.recorded_date;

  const vitalMappings: { field: keyof NextGenVitals; code: string; display: string; unit: string }[] = [
    { field: 'blood_pressure_systolic', code: '8480-6', display: 'Systolic blood pressure', unit: 'mmHg' },
    { field: 'blood_pressure_diastolic', code: '8462-4', display: 'Diastolic blood pressure', unit: 'mmHg' },
    { field: 'pulse_rate', code: '8867-4', display: 'Heart rate', unit: '/min' },
    { field: 'respiratory_rate', code: '9279-1', display: 'Respiratory rate', unit: '/min' },
    { field: 'temperature_fahrenheit', code: '8310-5', display: 'Body temperature', unit: 'degF' },
    { field: 'height_inches', code: '8302-2', display: 'Body height', unit: '[in_i]' },
    { field: 'weight_lbs', code: '29463-7', display: 'Body weight', unit: '[lb_av]' },
    { field: 'bmi', code: '39156-5', display: 'Body mass index', unit: 'kg/m2' },
    { field: 'oxygen_saturation', code: '2708-6', display: 'Oxygen saturation', unit: '%' },
    { field: 'pain_scale', code: '72514-3', display: 'Pain severity', unit: '{score}' },
  ];

  for (const mapping of vitalMappings) {
    const value = vitals[mapping.field];
    if (value !== undefined && value !== null && typeof value === 'number') {
      observations.push({
        resourceType: 'Observation',
        id: uuidv4(),
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs',
          }],
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: mapping.code,
            display: mapping.display,
          }],
          text: mapping.display,
        },
        subject: { reference: patientReference || 'Patient/unknown' },
        effectiveDateTime: dateTime,
        valueQuantity: {
          value: value,
          unit: mapping.unit,
          system: 'http://unitsofmeasure.org',
        },
        meta: {
          lastUpdated: new Date().toISOString(),
          tag: [{
            system: 'http://plumcare.io/ehr-source',
            code: 'nextgen',
            display: 'NextGen Healthcare',
          }],
        },
      });
    }
  }

  return observations;
}

/**
 * Transform NextGen Problem to FHIR Condition
 */
export function parseNextGenProblemToFhir(nextGenProblem: NextGenProblem, patientReference?: string): Condition {
  const condition: Condition = {
    resourceType: 'Condition',
    id: uuidv4(),
    identifier: [{
      system: 'http://nextgen.com/problem-id',
      value: nextGenProblem.problem_id,
    }],
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
        code: mapNextGenProblemStatus(nextGenProblem.status),
        display: nextGenProblem.status,
      }],
    },
    verificationStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
        code: 'confirmed',
        display: 'Confirmed',
      }],
    },
    code: {
      coding: [
        {
          system: nextGenProblem.icd_version === 'ICD-10' ? 'http://hl7.org/fhir/sid/icd-10-cm' : 'http://hl7.org/fhir/sid/icd-9-cm',
          code: nextGenProblem.icd_code,
          display: nextGenProblem.description,
        },
      ],
      text: nextGenProblem.description,
    },
    subject: { reference: patientReference || 'Patient/unknown' },
    onsetDateTime: nextGenProblem.onset_date ? `${nextGenProblem.onset_date}T00:00:00` : undefined,
    abatementDateTime: nextGenProblem.resolution_date ? `${nextGenProblem.resolution_date}T00:00:00` : undefined,
    recordedDate: nextGenProblem.created_timestamp,
    note: nextGenProblem.notes ? [{ text: nextGenProblem.notes }] : undefined,
    meta: {
      lastUpdated: nextGenProblem.modified_timestamp,
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'nextgen',
        display: 'NextGen Healthcare',
      }],
    },
  };

  // Add SNOMED code if present
  if (nextGenProblem.snomed_code) {
    condition.code?.coding?.push({
      system: 'http://snomed.info/sct',
      code: nextGenProblem.snomed_code,
    });
  }

  return condition;
}

/**
 * Transform NextGen Allergy to FHIR AllergyIntolerance
 */
export function parseNextGenAllergyToFhir(nextGenAllergy: NextGenAllergy, patientReference?: string): AllergyIntolerance {
  const categoryMap: Record<string, 'food' | 'medication' | 'environment' | 'biologic'> = {
    'Drug': 'medication',
    'Food': 'food',
    'Environment': 'environment',
    'Latex': 'biologic',
    'Other': 'biologic',
  };

  const allergy: AllergyIntolerance = {
    resourceType: 'AllergyIntolerance',
    id: uuidv4(),
    identifier: [{
      system: 'http://nextgen.com/allergy-id',
      value: nextGenAllergy.allergy_id,
    }],
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
        code: mapNextGenAllergyStatus(nextGenAllergy.status),
        display: nextGenAllergy.status,
      }],
    },
    verificationStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
        code: nextGenAllergy.verified ? 'confirmed' : 'unconfirmed',
        display: nextGenAllergy.verified ? 'Confirmed' : 'Unconfirmed',
      }],
    },
    type: nextGenAllergy.allergen_type === 'Drug' ? 'allergy' : 'intolerance',
    category: [categoryMap[nextGenAllergy.allergen_type] || 'biologic'],
    code: {
      coding: nextGenAllergy.allergen_code ? [{
        system: nextGenAllergy.allergen_code_system === 'SNOMED' ? 'http://snomed.info/sct' : `http://nextgen.com/${nextGenAllergy.allergen_code_system}`,
        code: nextGenAllergy.allergen_code,
        display: nextGenAllergy.allergen_name,
      }] : undefined,
      text: nextGenAllergy.allergen_name,
    },
    patient: { reference: patientReference || 'Patient/unknown' },
    onsetDateTime: nextGenAllergy.onset_date ? `${nextGenAllergy.onset_date}T00:00:00` : undefined,
    recordedDate: nextGenAllergy.recorded_date,
    recorder: nextGenAllergy.recorded_by ? {
      display: nextGenAllergy.recorded_by,
    } : undefined,
    reaction: nextGenAllergy.reaction_description ? [{
      manifestation: [{
        text: nextGenAllergy.reaction_description,
      }],
      severity: nextGenAllergy.reaction_severity?.toLowerCase() as 'mild' | 'moderate' | 'severe' | undefined,
    }] : undefined,
    note: nextGenAllergy.notes ? [{ text: nextGenAllergy.notes }] : undefined,
    meta: {
      lastUpdated: nextGenAllergy.modified_timestamp,
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'nextgen',
        display: 'NextGen Healthcare',
      }],
    },
  };

  return allergy;
}

/**
 * Transform NextGen Medication to FHIR MedicationStatement
 */
export function parseNextGenMedicationToFhir(nextGenMedication: NextGenMedication, patientReference?: string): MedicationStatement {
  const medication: MedicationStatement = {
    resourceType: 'MedicationStatement',
    id: uuidv4(),
    identifier: [{
      system: 'http://nextgen.com/medication-id',
      value: nextGenMedication.medication_id,
    }],
    status: mapNextGenMedicationStatus(nextGenMedication.status),
    medicationCodeableConcept: {
      coding: nextGenMedication.drug_code ? [{
        system: nextGenMedication.drug_code_system === 'RxNorm' ? 'http://www.nlm.nih.gov/research/umls/rxnorm' :
                nextGenMedication.drug_code_system === 'NDC' ? 'http://hl7.org/fhir/sid/ndc' :
                'http://nextgen.com/drug-code',
        code: nextGenMedication.drug_code,
        display: nextGenMedication.drug_name,
      }] : undefined,
      text: nextGenMedication.drug_name,
    },
    subject: patientReference ? { reference: patientReference } : { reference: 'Patient/unknown' },
    effectivePeriod: {
      start: nextGenMedication.start_date ? `${nextGenMedication.start_date}T00:00:00` : undefined,
      end: nextGenMedication.end_date ? `${nextGenMedication.end_date}T00:00:00` : undefined,
    },
    dateAsserted: nextGenMedication.created_timestamp,
    dosage: [{
      text: nextGenMedication.sig,
      route: {
        text: nextGenMedication.route,
      },
      method: {
        text: nextGenMedication.dosage_form,
      },
      timing: {
        code: {
          text: nextGenMedication.frequency,
        },
        repeat: nextGenMedication.days_supply ? {
          boundsDuration: {
            value: nextGenMedication.days_supply,
            unit: 'days',
            system: 'http://unitsofmeasure.org',
            code: 'd',
          },
        } : undefined,
      },
      doseAndRate: [{
        doseQuantity: {
          value: nextGenMedication.quantity_prescribed,
          unit: nextGenMedication.quantity_unit,
        },
      }],
    }],
    meta: {
      lastUpdated: nextGenMedication.modified_timestamp,
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'nextgen',
        display: 'NextGen Healthcare',
      }],
    },
  };

  // Add reason stopped if discontinued
  if (nextGenMedication.status === 'Discontinued' && nextGenMedication.discontinue_reason) {
    medication.statusReason = [{
      text: nextGenMedication.discontinue_reason,
    }];
  }

  return medication;
}

/**
 * Transform NextGen Lab Order to FHIR DiagnosticReport and Observations
 */
export function parseNextGenLabOrderToFhir(
  nextGenLabOrder: NextGenLabOrder,
  patientReference?: string
): { report: DiagnosticReport; observations: Observation[] } {
  const observations: Observation[] = [];

  // Create observations for results if available
  if (nextGenLabOrder.results) {
    for (const result of nextGenLabOrder.results) {
      const observation: Observation = {
        resourceType: 'Observation',
        id: uuidv4(),
        identifier: [{
          system: 'http://nextgen.com/result-id',
          value: result.result_id,
        }],
        status: result.result_status === 'Final' ? 'final' :
                result.result_status === 'Preliminary' ? 'preliminary' :
                result.result_status === 'Corrected' ? 'corrected' : 'cancelled',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory',
            display: 'Laboratory',
          }],
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: result.loinc_code,
            display: result.test_name,
          }],
          text: result.test_name,
        },
        subject: { reference: patientReference || 'Patient/unknown' },
        effectiveDateTime: `${result.performed_date}T00:00:00`,
        valueQuantity: {
          value: parseFloat(result.result_value),
          unit: result.result_unit,
          system: 'http://unitsofmeasure.org',
        },
        interpretation: result.abnormal_flag && result.abnormal_flag !== 'N' ? [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: result.abnormal_flag,
          }],
        }] : undefined,
        referenceRange: result.reference_range_text ? [{
          text: result.reference_range_text,
          low: result.reference_range_low ? {
            value: parseFloat(result.reference_range_low),
            unit: result.result_unit,
          } : undefined,
          high: result.reference_range_high ? {
            value: parseFloat(result.reference_range_high),
            unit: result.result_unit,
          } : undefined,
        }] : undefined,
        note: result.notes ? [{ text: result.notes }] : undefined,
        meta: {
          lastUpdated: new Date().toISOString(),
          tag: [{
            system: 'http://plumcare.io/ehr-source',
            code: 'nextgen',
            display: 'NextGen Healthcare',
          }],
        },
      };

      observations.push(observation);
    }
  }

  // Create diagnostic report
  const report: DiagnosticReport = {
    resourceType: 'DiagnosticReport',
    id: uuidv4(),
    identifier: [{
      system: 'http://nextgen.com/order-id',
      value: nextGenLabOrder.order_id,
    }],
    status: nextGenLabOrder.order_status === 'Completed' ? 'final' :
            nextGenLabOrder.order_status === 'Cancelled' ? 'cancelled' :
            nextGenLabOrder.order_status === 'In Process' ? 'partial' : 'registered',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
        code: 'LAB',
        display: 'Laboratory',
      }],
    }],
    code: {
      coding: nextGenLabOrder.order_tests.map(t => ({
        system: t.loinc_code ? 'http://loinc.org' : 'http://nextgen.com/test-code',
        code: t.loinc_code || t.test_code,
        display: t.test_name,
      })),
      text: nextGenLabOrder.order_tests.map(t => t.test_name).join(', '),
    },
    subject: { reference: patientReference || 'Patient/unknown' },
    effectiveDateTime: nextGenLabOrder.result_date ? `${nextGenLabOrder.result_date}T00:00:00` : undefined,
    issued: nextGenLabOrder.modified_timestamp,
    performer: nextGenLabOrder.performing_lab_name ? [{
      display: nextGenLabOrder.performing_lab_name,
      identifier: nextGenLabOrder.performing_lab_id ? {
        system: 'http://nextgen.com/lab-id',
        value: nextGenLabOrder.performing_lab_id,
      } : undefined,
    }] : undefined,
    result: observations.map(obs => ({
      reference: `Observation/${obs.id}`,
      display: obs.code?.text,
    })),
    meta: {
      lastUpdated: nextGenLabOrder.modified_timestamp,
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'nextgen',
        display: 'NextGen Healthcare',
      }],
    },
  };

  return { report, observations };
}

/**
 * Transform complete NextGen patient data to FHIR Bundle
 */
export function parseNextgenJsonToFhir(data: {
  patient: NextGenPatient;
  encounters?: NextGenEncounter[];
  problems?: NextGenProblem[];
  allergies?: NextGenAllergy[];
  medications?: NextGenMedication[];
  labOrders?: NextGenLabOrder[];
}): Bundle {
  const entries: BundleEntry[] = [];

  // Transform patient
  const patient = parseNextGenPatientToFhir(data.patient);
  entries.push({
    fullUrl: `urn:uuid:${patient.id}`,
    resource: patient,
    request: {
      method: 'POST',
      url: 'Patient',
    },
  });

  const patientReference = `Patient/${patient.id}`;

  // Transform encounters
  if (data.encounters) {
    for (const enc of data.encounters) {
      const encounter = parseNextGenEncounterToFhir(enc, patientReference);
      entries.push({
        fullUrl: `urn:uuid:${encounter.id}`,
        resource: encounter,
        request: {
          method: 'POST',
          url: 'Encounter',
        },
      });

      // Extract vitals from encounters
      if (enc.vitals) {
        const observations = parseNextGenVitalsToFhir(enc.vitals, patientReference);
        for (const obs of observations) {
          entries.push({
            fullUrl: `urn:uuid:${obs.id}`,
            resource: obs,
            request: {
              method: 'POST',
              url: 'Observation',
            },
          });
        }
      }
    }
  }

  // Transform problems
  if (data.problems) {
    for (const prob of data.problems) {
      const condition = parseNextGenProblemToFhir(prob, patientReference);
      entries.push({
        fullUrl: `urn:uuid:${condition.id}`,
        resource: condition,
        request: {
          method: 'POST',
          url: 'Condition',
        },
      });
    }
  }

  // Transform allergies
  if (data.allergies) {
    for (const allergy of data.allergies) {
      const allergyIntolerance = parseNextGenAllergyToFhir(allergy, patientReference);
      entries.push({
        fullUrl: `urn:uuid:${allergyIntolerance.id}`,
        resource: allergyIntolerance,
        request: {
          method: 'POST',
          url: 'AllergyIntolerance',
        },
      });
    }
  }

  // Transform medications
  if (data.medications) {
    for (const med of data.medications) {
      const medicationStatement = parseNextGenMedicationToFhir(med, patientReference);
      entries.push({
        fullUrl: `urn:uuid:${medicationStatement.id}`,
        resource: medicationStatement,
        request: {
          method: 'POST',
          url: 'MedicationStatement',
        },
      });
    }
  }

  // Transform lab orders
  if (data.labOrders) {
    for (const lab of data.labOrders) {
      const { report, observations } = parseNextGenLabOrderToFhir(lab, patientReference);

      for (const obs of observations) {
        entries.push({
          fullUrl: `urn:uuid:${obs.id}`,
          resource: obs,
          request: {
            method: 'POST',
            url: 'Observation',
          },
        });
      }

      entries.push({
        fullUrl: `urn:uuid:${report.id}`,
        resource: report,
        request: {
          method: 'POST',
          url: 'DiagnosticReport',
        },
      });
    }
  }

  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: entries,
  };
}
