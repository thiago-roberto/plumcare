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
  AthenaPatient,
  AthenaEncounter,
  AthenaVitals,
  AthenaLabResult,
  AthenaProblem,
  AthenaAllergy,
  AthenaMedication,
} from '../generators/athena.generator.js';

function mapAthenaGender(sex: string): 'male' | 'female' | 'other' | 'unknown' {
  switch (sex.toUpperCase()) {
    case 'M': return 'male';
    case 'F': return 'female';
    case 'O': return 'other';
    default: return 'unknown';
  }
}

function mapAthenaEncounterType(type: string): { code: string; display: string } {
  const typeMap: Record<string, { code: string; display: string }> = {
    'OFFICE': { code: 'AMB', display: 'ambulatory' },
    'TELEHEALTH': { code: 'VR', display: 'virtual' },
    'INPATIENT': { code: 'IMP', display: 'inpatient encounter' },
    'EMERGENCY': { code: 'EMER', display: 'emergency' },
    'HOME VISIT': { code: 'HH', display: 'home health' },
  };
  return typeMap[type.toUpperCase()] || { code: 'AMB', display: 'ambulatory' };
}

function mapAthenaEncounterStatus(status: string): 'planned' | 'arrived' | 'in-progress' | 'finished' | 'cancelled' {
  switch (status.toUpperCase()) {
    case 'OPEN': return 'in-progress';
    case 'CLOSED': return 'finished';
    case 'CANCELLED': return 'cancelled';
    default: return 'in-progress';
  }
}

function mapAthenaProblemStatus(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'active';
    case 'CHRONIC': return 'active';
    case 'RESOLVED': return 'resolved';
    case 'INACTIVE': return 'inactive';
    default: return 'active';
  }
}

/**
 * Transform Athena Patient to FHIR Patient
 */
export function parseAthenaPatientToFhir(athenaPatient: AthenaPatient): Patient {
  const patient: Patient = {
    resourceType: 'Patient',
    id: uuidv4(),
    identifier: [
      {
        system: 'http://athenahealth.com/patient-id',
        value: athenaPatient.patientid,
        type: {
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
            code: 'MR',
            display: 'Medical Record Number',
          }],
        },
      },
      {
        system: `http://athenahealth.com/enterprise/${athenaPatient.enterpriseid}`,
        value: athenaPatient.patientid,
      },
    ],
    name: [{
      use: 'official',
      family: athenaPatient.lastname,
      given: [athenaPatient.firstname, athenaPatient.middlename].filter(Boolean) as string[],
    }],
    gender: mapAthenaGender(athenaPatient.sex),
    birthDate: athenaPatient.dob,
    telecom: [],
    address: [],
    extension: [],
    meta: {
      lastUpdated: new Date().toISOString(),
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'athena',
        display: 'Athena Health',
      }],
    },
  };

  // Add SSN if present
  if (athenaPatient.ssn) {
    patient.identifier?.push({
      system: 'http://hl7.org/fhir/sid/us-ssn',
      value: athenaPatient.ssn,
    });
  }

  // Add preferred name
  if (athenaPatient.preferredname) {
    patient.name?.push({
      use: 'nickname',
      given: [athenaPatient.preferredname],
    });
  }

  // Add phones
  if (athenaPatient.homephone) {
    patient.telecom?.push({
      system: 'phone',
      value: athenaPatient.homephone,
      use: 'home',
    });
  }
  if (athenaPatient.mobilephone) {
    patient.telecom?.push({
      system: 'phone',
      value: athenaPatient.mobilephone,
      use: 'mobile',
    });
  }
  if (athenaPatient.workphone) {
    patient.telecom?.push({
      system: 'phone',
      value: athenaPatient.workphone,
      use: 'work',
    });
  }

  // Add email
  if (athenaPatient.email) {
    patient.telecom?.push({
      system: 'email',
      value: athenaPatient.email,
    });
  }

  // Add address
  if (athenaPatient.address1 || athenaPatient.city) {
    patient.address?.push({
      use: 'home',
      line: [athenaPatient.address1, athenaPatient.address2].filter(Boolean) as string[],
      city: athenaPatient.city,
      state: athenaPatient.state,
      postalCode: athenaPatient.zip,
      country: athenaPatient.countrycode || 'US',
    });
  }

  // Add marital status
  if (athenaPatient.maritalstatus) {
    patient.maritalStatus = {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v3-MaritalStatus',
        code: athenaPatient.maritalstatus.charAt(0).toUpperCase(),
        display: athenaPatient.maritalstatus,
      }],
    };
  }

  // Add race extension
  if (athenaPatient.race) {
    patient.extension?.push({
      url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race',
      extension: [{
        url: 'text',
        valueString: athenaPatient.racename || athenaPatient.race,
      }],
    });
  }

  // Add ethnicity extension
  if (athenaPatient.ethnicity) {
    patient.extension?.push({
      url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity',
      extension: [{
        url: 'text',
        valueString: athenaPatient.ethnicityname || athenaPatient.ethnicity,
      }],
    });
  }

  // Add language
  if (athenaPatient.language6392code) {
    patient.communication = [{
      language: {
        coding: [{
          system: 'urn:ietf:bcp:47',
          code: athenaPatient.language6392code,
        }],
      },
      preferred: true,
    }];
  }

  return patient;
}

/**
 * Transform Athena Encounter to FHIR Encounter
 */
export function parseAthenaEncounterToFhir(athenaEncounter: AthenaEncounter, patientReference?: string): Encounter {
  const encounterClass = mapAthenaEncounterType(athenaEncounter.encountertype);

  const encounter: Encounter = {
    resourceType: 'Encounter',
    id: uuidv4(),
    identifier: [{
      system: 'http://athenahealth.com/encounter-id',
      value: athenaEncounter.encounterid,
    }],
    status: mapAthenaEncounterStatus(athenaEncounter.encounterstatus),
    class: {
      system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
      code: encounterClass.code,
      display: encounterClass.display,
    },
    type: [{
      coding: [{
        system: 'http://athenahealth.com/encounter-type',
        code: athenaEncounter.encountertype,
        display: athenaEncounter.encountertype,
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
        display: `${athenaEncounter.providerfirstname} ${athenaEncounter.providerlastname}`,
        identifier: {
          system: 'http://athenahealth.com/provider-id',
          value: athenaEncounter.providerid,
        },
      },
    }],
    period: {
      start: `${athenaEncounter.encounterdate}T00:00:00`,
      end: athenaEncounter.closeddatetime,
    },
    meta: {
      lastUpdated: new Date().toISOString(),
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'athena',
        display: 'Athena Health',
      }],
    },
  };

  // Add diagnoses
  if (athenaEncounter.diagnoses && athenaEncounter.diagnoses.length > 0) {
    encounter.diagnosis = athenaEncounter.diagnoses.map(diag => ({
      condition: {
        display: diag.description,
      },
      use: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/diagnosis-role',
          code: diag.sequence === 1 ? 'AD' : 'DD',
          display: diag.sequence === 1 ? 'Admission diagnosis' : 'Discharge diagnosis',
        }],
      },
      rank: diag.sequence,
    }));
  }

  return encounter;
}

/**
 * Transform Athena Vitals to FHIR Observations
 */
export function parseAthenaVitalsToFhir(athenaVitals: AthenaVitals, patientReference?: string): Observation[] {
  return athenaVitals.vitals.map(vital => {
    const observation: Observation = {
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
        text: vital.vitalname,
      },
      subject: { reference: patientReference || 'Patient/unknown' },
      effectiveDateTime: athenaVitals.readingdatetime,
      valueQuantity: {
        value: parseFloat(vital.vitalvalue),
        unit: vital.vitalunits,
        system: 'http://unitsofmeasure.org',
      },
      meta: {
        lastUpdated: new Date().toISOString(),
        tag: [{
          system: 'http://plumcare.io/ehr-source',
          code: 'athena',
          display: 'Athena Health',
        }],
      },
    };

    return observation;
  });
}

/**
 * Transform Athena Lab Result to FHIR DiagnosticReport and Observations
 */
export function parseAthenaLabResultToFhir(
  athenaLabResult: AthenaLabResult,
  patientReference?: string
): { report: DiagnosticReport; observations: Observation[] } {
  const observations: Observation[] = [];

  // Create observations for each analyte
  for (const panel of athenaLabResult.panels) {
    for (const analyte of panel.analytes) {
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
            code: analyte.loinccode,
            display: analyte.analytename,
          }],
          text: analyte.analytename,
        },
        subject: { reference: patientReference || 'Patient/unknown' },
        effectiveDateTime: `${athenaLabResult.resultdate}T00:00:00`,
        valueQuantity: {
          value: parseFloat(analyte.analytevalue),
          unit: analyte.units,
          system: 'http://unitsofmeasure.org',
        },
        interpretation: analyte.abnormalflag ? [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: analyte.abnormalflag,
          }],
        }] : undefined,
        referenceRange: [{
          text: analyte.referencerange,
        }],
        meta: {
          lastUpdated: new Date().toISOString(),
          tag: [{
            system: 'http://plumcare.io/ehr-source',
            code: 'athena',
            display: 'Athena Health',
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
      system: 'http://athenahealth.com/lab-result-id',
      value: athenaLabResult.labresultid,
    }],
    status: 'final',
    category: [{
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
        code: 'LAB',
        display: 'Laboratory',
      }],
    }],
    code: {
      coding: athenaLabResult.panels.map(p => ({
        system: 'http://loinc.org',
        code: p.loinccode,
        display: p.panelname,
      })),
      text: athenaLabResult.panels.map(p => p.panelname).join(', '),
    },
    subject: { reference: patientReference || 'Patient/unknown' },
    effectiveDateTime: `${athenaLabResult.resultdate}T00:00:00`,
    issued: new Date().toISOString(),
    performer: [{
      display: athenaLabResult.performinglabname,
    }],
    result: observations.map(obs => ({
      reference: `Observation/${obs.id}`,
      display: obs.code?.text,
    })),
    meta: {
      lastUpdated: new Date().toISOString(),
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'athena',
        display: 'Athena Health',
      }],
    },
  };

  return { report, observations };
}

/**
 * Transform Athena Problem to FHIR Condition
 */
export function parseAthenaProblemToFhir(athenaProblem: AthenaProblem, patientReference?: string): Condition {
  const condition: Condition = {
    resourceType: 'Condition',
    id: uuidv4(),
    identifier: [{
      system: 'http://athenahealth.com/problem-id',
      value: athenaProblem.problemid,
    }],
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
        code: mapAthenaProblemStatus(athenaProblem.status),
        display: athenaProblem.status,
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
        code: athenaProblem.icd10code,
        display: athenaProblem.name,
      }],
      text: athenaProblem.name,
    },
    subject: { reference: patientReference || 'Patient/unknown' },
    onsetDateTime: athenaProblem.onsetdate ? `${athenaProblem.onsetdate}T00:00:00` : undefined,
    recordedDate: athenaProblem.lastmodifieddatetime,
    note: athenaProblem.note ? [{ text: athenaProblem.note }] : undefined,
    meta: {
      lastUpdated: new Date().toISOString(),
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'athena',
        display: 'Athena Health',
      }],
    },
  };

  // Add SNOMED code if present
  if (athenaProblem.snomedcode) {
    condition.code?.coding?.push({
      system: 'http://snomed.info/sct',
      code: athenaProblem.snomedcode,
    });
  }

  return condition;
}

/**
 * Transform Athena Allergy to FHIR AllergyIntolerance
 */
export function parseAthenaAllergyToFhir(athenaAllergy: AthenaAllergy, patientReference?: string): AllergyIntolerance {
  const allergy: AllergyIntolerance = {
    resourceType: 'AllergyIntolerance',
    id: uuidv4(),
    identifier: [{
      system: 'http://athenahealth.com/allergy-id',
      value: athenaAllergy.allergyid,
    }],
    clinicalStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
        code: athenaAllergy.status,
        display: athenaAllergy.status === 'active' ? 'Active' : 'Inactive',
      }],
    },
    verificationStatus: {
      coding: [{
        system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
        code: 'confirmed',
        display: 'Confirmed',
      }],
    },
    code: {
      coding: [{
        system: 'http://athenahealth.com/allergen',
        code: athenaAllergy.allergenid,
        display: athenaAllergy.allergenname,
      }],
      text: athenaAllergy.allergenname,
    },
    patient: { reference: patientReference || 'Patient/unknown' },
    onsetDateTime: athenaAllergy.onsetdate ? `${athenaAllergy.onsetdate}T00:00:00` : undefined,
    reaction: athenaAllergy.reactions && athenaAllergy.reactions.length > 0 ? [{
      manifestation: athenaAllergy.reactions.map(r => ({
        text: r,
      })),
      severity: athenaAllergy.severity,
    }] : undefined,
    note: athenaAllergy.note ? [{ text: athenaAllergy.note }] : undefined,
    meta: {
      lastUpdated: new Date().toISOString(),
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'athena',
        display: 'Athena Health',
      }],
    },
  };

  return allergy;
}

/**
 * Transform Athena Medication to FHIR MedicationStatement
 */
export function parseAthenaMedicationToFhir(athenaMedication: AthenaMedication, patientReference?: string): MedicationStatement {
  const medication: MedicationStatement = {
    resourceType: 'MedicationStatement',
    id: uuidv4(),
    identifier: [{
      system: 'http://athenahealth.com/medication-id',
      value: athenaMedication.medicationid,
    }],
    status: athenaMedication.status === 'active' ? 'active' : athenaMedication.status === 'discontinued' ? 'stopped' : 'completed',
    medicationCodeableConcept: {
      coding: [{
        system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
        code: athenaMedication.medicationcode,
        display: athenaMedication.medication,
      }],
      text: athenaMedication.medication,
    },
    subject: patientReference ? { reference: patientReference } : { reference: 'Patient/unknown' },
    effectivePeriod: {
      start: athenaMedication.startdate ? `${athenaMedication.startdate}T00:00:00` : undefined,
      end: athenaMedication.stopdate ? `${athenaMedication.stopdate}T00:00:00` : undefined,
    },
    dateAsserted: athenaMedication.prescribeddatetime,
    dosage: [{
      text: athenaMedication.sig,
    }],
    meta: {
      lastUpdated: new Date().toISOString(),
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'athena',
        display: 'Athena Health',
      }],
    },
  };

  return medication;
}

/**
 * Transform complete Athena patient data to FHIR Bundle
 */
export function parseAthenaJsonToFhir(data: {
  patient: AthenaPatient;
  encounters?: AthenaEncounter[];
  problems?: AthenaProblem[];
  allergies?: AthenaAllergy[];
  medications?: AthenaMedication[];
  vitals?: AthenaVitals[];
  labResults?: AthenaLabResult[];
}): Bundle {
  const entries: BundleEntry[] = [];

  // Transform patient
  const patient = parseAthenaPatientToFhir(data.patient);
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
      const encounter = parseAthenaEncounterToFhir(enc, patientReference);
      entries.push({
        fullUrl: `urn:uuid:${encounter.id}`,
        resource: encounter,
        request: {
          method: 'POST',
          url: 'Encounter',
        },
      });
    }
  }

  // Transform problems
  if (data.problems) {
    for (const prob of data.problems) {
      const condition = parseAthenaProblemToFhir(prob, patientReference);
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
      const allergyIntolerance = parseAthenaAllergyToFhir(allergy, patientReference);
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
      const medicationStatement = parseAthenaMedicationToFhir(med, patientReference);
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

  // Transform vitals
  if (data.vitals) {
    for (const vital of data.vitals) {
      const observations = parseAthenaVitalsToFhir(vital, patientReference);
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

  // Transform lab results
  if (data.labResults) {
    for (const lab of data.labResults) {
      const { report, observations } = parseAthenaLabResultToFhir(lab, patientReference);

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
