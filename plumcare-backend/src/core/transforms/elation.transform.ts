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
  ElationPatient,
  ElationVisitNote,
  ElationProblem,
  ElationAllergy,
  ElationMedication,
  ElationLabOrder,
  ElationVitals,
} from '../generators/elation.generator.js';

function mapElationGender(sex: string): 'male' | 'female' | 'other' | 'unknown' {
  switch (sex) {
    case 'Male': return 'male';
    case 'Female': return 'female';
    case 'Other': return 'other';
    default: return 'unknown';
  }
}

function mapElationEncounterStatus(status: string): 'planned' | 'arrived' | 'in-progress' | 'finished' | 'cancelled' {
  switch (status) {
    case 'Scheduled':
    case 'Confirmed': return 'planned';
    case 'Checked In':
    case 'Roomed': return 'arrived';
    case 'In Progress': return 'in-progress';
    case 'Completed': return 'finished';
    case 'Cancelled':
    case 'No Show': return 'cancelled';
    default: return 'in-progress';
  }
}

function mapElationProblemStatus(status: string): string {
  switch (status) {
    case 'Active': return 'active';
    case 'Resolved': return 'resolved';
    case 'Inactive': return 'inactive';
    default: return 'active';
  }
}

function mapElationAllergyStatus(status: string): string {
  return status === 'Active' ? 'active' : 'inactive';
}

function mapElationMedicationStatus(status: string): 'active' | 'completed' | 'stopped' {
  switch (status) {
    case 'Active': return 'active';
    case 'Completed': return 'completed';
    case 'Discontinued': return 'stopped';
    default: return 'active';
  }
}

/**
 * Transform Elation Patient to FHIR Patient
 */
export function parseElationPatientToFhir(elationPatient: ElationPatient): Patient {
  const patient: Patient = {
    resourceType: 'Patient',
    id: uuidv4(),
    identifier: [
      {
        system: 'http://elationemr.com/patient-id',
        value: elationPatient.id.toString(),
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
      family: elationPatient.last_name,
      given: [elationPatient.first_name, elationPatient.middle_name].filter(Boolean) as string[],
    }],
    gender: mapElationGender(elationPatient.sex),
    birthDate: elationPatient.dob,
    telecom: [],
    address: [],
    extension: [],
    meta: {
      lastUpdated: elationPatient.last_modified_date,
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'elation',
        display: 'Elation Health',
      }],
    },
  };

  // Add MRN if present
  if (elationPatient.mrn) {
    patient.identifier?.push({
      system: 'http://elationemr.com/mrn',
      value: elationPatient.mrn,
    });
  }

  // Add SSN if present
  if (elationPatient.ssn) {
    patient.identifier?.push({
      system: 'http://hl7.org/fhir/sid/us-ssn',
      value: elationPatient.ssn,
    });
  }

  // Add nickname
  if (elationPatient.nickname) {
    patient.name?.push({
      use: 'nickname',
      given: [elationPatient.nickname],
    });
  }

  // Add phones
  for (const phone of elationPatient.phones) {
    patient.telecom?.push({
      system: 'phone',
      value: phone.phone,
      use: phone.phone_type === 'Mobile' ? 'mobile' : phone.phone_type === 'Home' ? 'home' : 'work',
      rank: phone.is_primary ? 1 : 2,
    });
  }

  // Add emails
  for (const email of elationPatient.emails) {
    patient.telecom?.push({
      system: 'email',
      value: email.email,
      rank: email.is_primary ? 1 : 2,
    });
  }

  // Add address
  if (elationPatient.address) {
    patient.address?.push({
      use: 'home',
      line: [elationPatient.address.address_line1, elationPatient.address.address_line2].filter(Boolean) as string[],
      city: elationPatient.address.city,
      state: elationPatient.address.state,
      postalCode: elationPatient.address.zip,
      country: elationPatient.address.country,
    });
  }

  // Add marital status
  if (elationPatient.marital_status) {
    patient.maritalStatus = {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
        code: elationPatient.marital_status.charAt(0).toUpperCase(),
        display: elationPatient.marital_status,
      }],
    };
  }

  // Add race extension
  if (elationPatient.race) {
    patient.extension?.push({
      url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race',
      extension: [{
        url: 'text',
        valueString: elationPatient.race,
      }],
    });
  }

  // Add ethnicity extension
  if (elationPatient.ethnicity) {
    patient.extension?.push({
      url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity',
      extension: [{
        url: 'text',
        valueString: elationPatient.ethnicity,
      }],
    });
  }

  // Add language
  if (elationPatient.preferred_language) {
    patient.communication = [{
      language: {
        coding: [{
          system: 'urn:ietf:bcp:47',
          code: elationPatient.preferred_language,
        }],
      },
      preferred: true,
    }];
  }

  // Add emergency contact
  if (elationPatient.emergency_contact) {
    patient.contact = [{
      relationship: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v2-0131',
          code: 'C',
          display: 'Emergency Contact',
        }],
        text: elationPatient.emergency_contact.relationship,
      }],
      name: {
        text: elationPatient.emergency_contact.name,
      },
      telecom: [{
        system: 'phone',
        value: elationPatient.emergency_contact.phone,
      }],
    }];
  }

  return patient;
}

/**
 * Transform Elation Visit Note to FHIR Encounter
 */
export function parseElationVisitNoteToFhir(visitNote: ElationVisitNote, patientReference?: string): Encounter {
  const encounter: Encounter = {
    resourceType: 'Encounter',
    id: uuidv4(),
    identifier: [{
      system: 'http://elationemr.com/visit-note-id',
      value: visitNote.id.toString(),
    }],
    status: visitNote.signed ? 'finished' : 'in-progress',
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: visitNote.visit_type.toLowerCase().includes('telehealth') ? 'VR' : 'AMB',
      display: visitNote.visit_type.toLowerCase().includes('telehealth') ? 'virtual' : 'ambulatory',
    },
    type: [{
      coding: [{
        system: 'http://elationemr.com/visit-type',
        code: visitNote.visit_type,
        display: visitNote.visit_type,
      }],
    }],
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
          system: 'http://elationemr.com/physician-id',
          value: visitNote.physician.toString(),
        },
      },
    }],
    period: {
      start: `${visitNote.document_date}T00:00:00`,
    },
    reasonCode: visitNote.chief_complaint ? [{
      text: visitNote.chief_complaint,
    }] : undefined,
    diagnosis: visitNote.icd10_codes.map(diag => ({
      condition: {
        display: diag.description,
      },
      use: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/diagnosis-role',
          code: diag.rank === 1 ? 'AD' : 'DD',
        }],
      },
      rank: diag.rank,
    })),
    meta: {
      lastUpdated: visitNote.last_modified_date,
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'elation',
        display: 'Elation Health',
      }],
    },
  };

  return encounter;
}

/**
 * Transform Elation Vitals to FHIR Observations
 */
export function parseElationVitalsToFhir(vitals: ElationVitals, patientReference?: string, effectiveDateTime?: string): Observation[] {
  const observations: Observation[] = [];
  const dateTime = effectiveDateTime || new Date().toISOString();

  const vitalMappings: { field: keyof ElationVitals; code: string; display: string; unit: string }[] = [
    { field: 'blood_pressure_systolic', code: '8480-6', display: 'Systolic blood pressure', unit: 'mmHg' },
    { field: 'blood_pressure_diastolic', code: '8462-4', display: 'Diastolic blood pressure', unit: 'mmHg' },
    { field: 'heart_rate', code: '8867-4', display: 'Heart rate', unit: '/min' },
    { field: 'respiratory_rate', code: '9279-1', display: 'Respiratory rate', unit: '/min' },
    { field: 'temperature', code: '8310-5', display: 'Body temperature', unit: vitals.temperature_unit || 'degF' },
    { field: 'height', code: '8302-2', display: 'Body height', unit: vitals.height_unit || 'in' },
    { field: 'weight', code: '29463-7', display: 'Body weight', unit: vitals.weight_unit || 'lb' },
    { field: 'bmi', code: '39156-5', display: 'Body mass index', unit: 'kg/m2' },
    { field: 'oxygen_saturation', code: '2708-6', display: 'Oxygen saturation', unit: '%' },
    { field: 'pain_level', code: '72514-3', display: 'Pain severity', unit: '{score}' },
  ];

  for (const mapping of vitalMappings) {
    const value = vitals[mapping.field];
    if (value !== undefined && value !== null) {
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
          value: value as number,
          unit: mapping.unit,
          system: 'http://unitsofmeasure.org',
        },
        meta: {
          lastUpdated: new Date().toISOString(),
          tag: [{
            system: 'http://plumcare.io/ehr-source',
            code: 'elation',
            display: 'Elation Health',
          }],
        },
      });
    }
  }

  return observations;
}

/**
 * Transform Elation Problem to FHIR Condition
 */
export function parseElationProblemToFhir(elationProblem: ElationProblem, patientReference?: string): Condition {
  const condition: Condition = {
    resourceType: 'Condition',
    id: uuidv4(),
    identifier: [{
      system: 'http://elationemr.com/problem-id',
      value: elationProblem.id.toString(),
    }],
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
        code: mapElationProblemStatus(elationProblem.status),
        display: elationProblem.status,
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
      coding: [{
        system: 'http://hl7.org/fhir/sid/icd-10-cm',
        code: elationProblem.icd10_code,
        display: elationProblem.description,
      }],
      text: elationProblem.description,
    },
    subject: { reference: patientReference || 'Patient/unknown' },
    onsetDateTime: elationProblem.onset_date ? `${elationProblem.onset_date}T00:00:00` : undefined,
    abatementDateTime: elationProblem.resolved_date ? `${elationProblem.resolved_date}T00:00:00` : undefined,
    recordedDate: elationProblem.created_date,
    note: elationProblem.notes ? [{ text: elationProblem.notes }] : undefined,
    meta: {
      lastUpdated: elationProblem.last_modified_date,
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'elation',
        display: 'Elation Health',
      }],
    },
  };

  return condition;
}

/**
 * Transform Elation Allergy to FHIR AllergyIntolerance
 */
export function parseElationAllergyToFhir(elationAllergy: ElationAllergy, patientReference?: string): AllergyIntolerance {
  const allergy: AllergyIntolerance = {
    resourceType: 'AllergyIntolerance',
    id: uuidv4(),
    identifier: [{
      system: 'http://elationemr.com/allergy-id',
      value: elationAllergy.id.toString(),
    }],
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
        code: mapElationAllergyStatus(elationAllergy.status),
        display: elationAllergy.status,
      }],
    },
    verificationStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
        code: 'confirmed',
        display: 'Confirmed',
      }],
    },
    type: elationAllergy.allergen_type === 'Drug' ? 'allergy' : 'intolerance',
    category: [elationAllergy.allergen_type === 'Drug' ? 'medication' :
               elationAllergy.allergen_type === 'Food' ? 'food' :
               elationAllergy.allergen_type === 'Environmental' ? 'environment' : 'biologic'],
    code: {
      text: elationAllergy.allergen,
    },
    patient: { reference: patientReference || 'Patient/unknown' },
    onsetDateTime: elationAllergy.onset_date ? `${elationAllergy.onset_date}T00:00:00` : undefined,
    recordedDate: elationAllergy.created_date,
    reaction: elationAllergy.reaction ? [{
      manifestation: [{
        text: elationAllergy.reaction,
      }],
      severity: elationAllergy.severity?.toLowerCase() as 'mild' | 'moderate' | 'severe' | undefined,
    }] : undefined,
    note: elationAllergy.notes ? [{ text: elationAllergy.notes }] : undefined,
    meta: {
      lastUpdated: elationAllergy.last_modified_date,
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'elation',
        display: 'Elation Health',
      }],
    },
  };

  return allergy;
}

/**
 * Transform Elation Medication to FHIR MedicationStatement
 */
export function parseElationMedicationToFhir(elationMedication: ElationMedication, patientReference?: string): MedicationStatement {
  const medication: MedicationStatement = {
    resourceType: 'MedicationStatement',
    id: uuidv4(),
    identifier: [{
      system: 'http://elationemr.com/medication-id',
      value: elationMedication.id.toString(),
    }],
    status: mapElationMedicationStatus(elationMedication.status),
    medicationCodeableConcept: {
      coding: elationMedication.rxnorm ? [{
        system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
        code: elationMedication.rxnorm,
        display: elationMedication.drug_name,
      }] : undefined,
      text: elationMedication.drug_name,
    },
    subject: patientReference ? { reference: patientReference } : { reference: 'Patient/unknown' },
    effectivePeriod: {
      start: `${elationMedication.prescribed_date}T00:00:00`,
    },
    dateAsserted: elationMedication.created_date,
    dosage: [{
      text: elationMedication.sig,
      timing: {
        repeat: {
          boundsDuration: {
            value: elationMedication.days_supply,
            unit: 'days',
            system: 'http://unitsofmeasure.org',
            code: 'd',
          },
        },
      },
      doseAndRate: [{
        doseQuantity: {
          value: elationMedication.quantity,
          unit: elationMedication.quantity_unit,
        },
      }],
    }],
    meta: {
      lastUpdated: elationMedication.last_modified_date,
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'elation',
        display: 'Elation Health',
      }],
    },
  };

  // Add reason stopped if discontinued
  if (elationMedication.status === 'Discontinued' && elationMedication.discontinue_reason) {
    medication.statusReason = [{
      text: elationMedication.discontinue_reason,
    }];
  }

  return medication;
}

/**
 * Transform Elation Lab Order to FHIR DiagnosticReport and Observations
 */
export function parseElationLabOrderToFhir(
  elationLabOrder: ElationLabOrder,
  patientReference?: string
): { report: DiagnosticReport; observations: Observation[] } {
  const observations: Observation[] = [];

  // Create observations for results if available
  if (elationLabOrder.results) {
    for (const result of elationLabOrder.results) {
      const observation: Observation = {
        resourceType: 'Observation',
        id: uuidv4(),
        status: 'final',
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
        effectiveDateTime: elationLabOrder.result_date ? `${elationLabOrder.result_date}T00:00:00` : undefined,
        valueQuantity: {
          value: parseFloat(result.value),
          unit: result.unit,
          system: 'http://unitsofmeasure.org',
        },
        interpretation: result.abnormal_flag && result.abnormal_flag !== 'N' ? [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: result.abnormal_flag,
          }],
        }] : undefined,
        referenceRange: [{
          text: result.reference_range,
        }],
        meta: {
          lastUpdated: new Date().toISOString(),
          tag: [{
            system: 'http://plumcare.io/ehr-source',
            code: 'elation',
            display: 'Elation Health',
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
      system: 'http://elationemr.com/lab-order-id',
      value: elationLabOrder.id.toString(),
    }],
    status: elationLabOrder.status === 'Final' ? 'final' :
            elationLabOrder.status === 'Cancelled' ? 'cancelled' : 'registered',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
        code: 'LAB',
        display: 'Laboratory',
      }],
    }],
    code: {
      coding: elationLabOrder.tests.map(t => ({
        system: t.loinc_code ? 'http://loinc.org' : 'http://elationemr.com/test-code',
        code: t.loinc_code || t.code,
        display: t.name,
      })),
      text: elationLabOrder.tests.map(t => t.name).join(', '),
    },
    subject: { reference: patientReference || 'Patient/unknown' },
    effectiveDateTime: elationLabOrder.result_date ? `${elationLabOrder.result_date}T00:00:00` : undefined,
    issued: elationLabOrder.last_modified_date,
    performer: [{
      display: elationLabOrder.lab_name,
    }],
    result: observations.map(obs => ({
      reference: `Observation/${obs.id}`,
      display: obs.code?.text,
    })),
    meta: {
      lastUpdated: elationLabOrder.last_modified_date,
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'elation',
        display: 'Elation Health',
      }],
    },
  };

  return { report, observations };
}

/**
 * Transform complete Elation patient data to FHIR Bundle
 */
export function parseElationJsonToFhir(data: {
  patient: ElationPatient;
  visitNotes?: ElationVisitNote[];
  problems?: ElationProblem[];
  allergies?: ElationAllergy[];
  medications?: ElationMedication[];
  labOrders?: ElationLabOrder[];
}): Bundle {
  const entries: BundleEntry[] = [];

  // Transform patient
  const patient = parseElationPatientToFhir(data.patient);
  entries.push({
    fullUrl: `urn:uuid:${patient.id}`,
    resource: patient,
    request: {
      method: 'POST',
      url: 'Patient',
    },
  });

  const patientReference = `Patient/${patient.id}`;

  // Transform visit notes as encounters
  if (data.visitNotes) {
    for (const note of data.visitNotes) {
      const encounter = parseElationVisitNoteToFhir(note, patientReference);
      entries.push({
        fullUrl: `urn:uuid:${encounter.id}`,
        resource: encounter,
        request: {
          method: 'POST',
          url: 'Encounter',
        },
      });

      // Also extract vitals from visit notes
      if (note.vitals) {
        const observations = parseElationVitalsToFhir(note.vitals, patientReference, `${note.document_date}T00:00:00`);
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
      const condition = parseElationProblemToFhir(prob, patientReference);
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
      const allergyIntolerance = parseElationAllergyToFhir(allergy, patientReference);
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
      const medicationStatement = parseElationMedicationToFhir(med, patientReference);
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
      const { report, observations } = parseElationLabOrderToFhir(lab, patientReference);

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
