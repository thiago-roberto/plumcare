import {
  faker,
  generatePatientData,
  generateAllergy,
  generateMedication,
  generateDiagnosis,
  generateLabTest,
  generateVitalSign,
  generateProvider,
  formatDate,
  formatDateTime,
} from './utils.js';

// Athena-specific types matching their REST API format
export interface AthenaPatient {
  patientid: string;
  departmentid: string;
  enterpriseid: string;
  firstname: string;
  middlename?: string;
  lastname: string;
  suffix?: string;
  preferredname?: string;
  dob: string;
  sex: 'M' | 'F' | 'O' | 'U';
  ssn?: string;
  email?: string;
  homephone?: string;
  mobilephone?: string;
  workphone?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  countrycode?: string;
  maritalstatus?: string;
  race?: string;
  racename?: string;
  ethnicity?: string;
  ethnicityname?: string;
  language6392code?: string;
  guarantorrelationshiptopatient?: string;
  primaryproviderid?: string;
  registrationdate?: string;
  lastappointment?: string;
  balances?: AthenaBalance[];
  insurances?: AthenaInsurance[];
  customfields?: Record<string, string>;
}

export interface AthenaBalance {
  balance: number;
  providergroupid: string;
  cleanbalance: boolean;
}

export interface AthenaInsurance {
  insuranceid: string;
  insurancepackageid: string;
  insuranceplanname: string;
  insurancepolicyholder: string;
  insurancepolicyholderdob?: string;
  relationshiptoinsured: string;
  sequencenumber: number;
  eligibilitystatus: string;
  eligibilityreason?: string;
  eligibilitylastchecked?: string;
}

export interface AthenaAppointment {
  appointmentid: string;
  patientid: string;
  departmentid: string;
  appointmenttype: string;
  appointmenttypeid: string;
  date: string;
  starttime: string;
  duration: number;
  appointmentstatus: string;
  providerid: string;
  providerfirstname: string;
  providerlastname: string;
  reasonid?: string;
  reason?: string;
  checkindatetime?: string;
  checkoutdatetime?: string;
  encounterstatus?: string;
  encounterid?: string;
  scheduledby?: string;
  scheduleddatetime?: string;
  copay?: number;
  notes?: string;
}

export interface AthenaEncounter {
  encounterid: string;
  patientid: string;
  departmentid: string;
  appointmentid?: string;
  encountertype: string;
  encounterstatus: string;
  encounterdate: string;
  providerid: string;
  providerfirstname: string;
  providerlastname: string;
  billingproviderid?: string;
  supervisingproviderid?: string;
  diagnoses?: AthenaEncounterDiagnosis[];
  stage?: string;
  closeddatetime?: string;
}

export interface AthenaEncounterDiagnosis {
  diagnosissnowmedid?: string;
  icd10code: string;
  description: string;
  sequence: number;
}

export interface AthenaVitals {
  vitalid: string;
  patientid: string;
  departmentid: string;
  encounterid?: string;
  readingdatetime: string;
  vitals: {
    vitalname: string;
    vitalvalue: string;
    vitalunits: string;
    source?: string;
  }[];
}

export interface AthenaLabResult {
  labresultid: string;
  patientid: string;
  departmentid: string;
  orderid: string;
  ordereddate: string;
  resultdate: string;
  resultstatus: string;
  facilityid: string;
  performinglabname: string;
  panels: {
    panelname: string;
    loinccode: string;
    analytes: {
      analytename: string;
      analytevalue: string;
      units: string;
      referencerange: string;
      abnormalflag?: string;
      loinccode: string;
    }[];
  }[];
}

export interface AthenaProblem {
  problemid: string;
  patientid: string;
  departmentid: string;
  snomedcode?: string;
  icd10code: string;
  name: string;
  onsetdate?: string;
  status: 'ACTIVE' | 'CHRONIC' | 'RESOLVED' | 'INACTIVE';
  lastmodifieddatetime: string;
  source?: string;
  note?: string;
}

export interface AthenaAllergy {
  allergyid: string;
  patientid: string;
  departmentid: string;
  allergenname: string;
  allergenid: string;
  reactions?: string[];
  severity?: 'mild' | 'moderate' | 'severe';
  status: 'active' | 'inactive';
  onsetdate?: string;
  note?: string;
}

export interface AthenaMedication {
  medicationid: string;
  patientid: string;
  departmentid: string;
  medication: string;
  medicationcode: string;
  sig: string;
  quantity?: number;
  quantityunit?: string;
  refills?: number;
  prescribedby?: string;
  prescribeddatetime: string;
  startdate?: string;
  stopdate?: string;
  status: 'active' | 'discontinued' | 'completed';
  source: 'ehr' | 'patient-reported' | 'external';
}

// Helper to convert internal gender to Athena format
function toAthenaGender(gender: string): 'M' | 'F' | 'O' | 'U' {
  switch (gender) {
    case 'male': return 'M';
    case 'female': return 'F';
    case 'other': return 'O';
    default: return 'U';
  }
}

function toAthenaMaritalStatus(status: string): string {
  const map: Record<string, string> = {
    'S': 'SINGLE',
    'M': 'MARRIED',
    'D': 'DIVORCED',
    'W': 'WIDOWED',
  };
  return map[status] || 'UNKNOWN';
}

function toAthenaRace(code: string): { race: string; racename: string } {
  const races: Record<string, { race: string; racename: string }> = {
    '2106-3': { race: 'white', racename: 'White' },
    '2054-5': { race: 'black', racename: 'Black or African American' },
    '2028-9': { race: 'asian', racename: 'Asian' },
    '2076-8': { race: 'pacificislander', racename: 'Native Hawaiian or Other Pacific Islander' },
    '2131-1': { race: 'other', racename: 'Other' },
  };
  return races[code] || { race: 'unknown', racename: 'Unknown' };
}

function toAthenaEthnicity(code: string): { ethnicity: string; ethnicityname: string } {
  if (code === '2135-2') {
    return { ethnicity: 'hispanic', ethnicityname: 'Hispanic or Latino' };
  }
  return { ethnicity: 'nonhispanic', ethnicityname: 'Not Hispanic or Latino' };
}

/**
 * Generate an Athena Patient
 */
export function generateAthenaPatient(): AthenaPatient {
  const patient = generatePatientData('ATH-');
  const raceInfo = toAthenaRace(patient.race);
  const ethnicityInfo = toAthenaEthnicity(patient.ethnicity);
  const departmentId = faker.string.numeric(5);
  const enterpriseId = faker.string.numeric(4);
  const provider = generateProvider();

  const athenaPatient: AthenaPatient = {
    patientid: patient.mrn.replace('ATH-', ''),
    departmentid: departmentId,
    enterpriseid: enterpriseId,
    firstname: patient.firstName,
    lastname: patient.lastName,
    dob: formatDate(patient.dob),
    sex: toAthenaGender(patient.gender),
    email: patient.email,
    homephone: patient.phone.replace(/\D/g, ''),
    mobilephone: faker.datatype.boolean({ probability: 0.7 }) ? faker.string.numeric(10) : undefined,
    address1: patient.address.street,
    city: patient.address.city,
    state: patient.address.state,
    zip: patient.address.postalCode,
    countrycode: 'US',
    maritalstatus: toAthenaMaritalStatus(patient.maritalStatus),
    race: raceInfo.race,
    racename: raceInfo.racename,
    ethnicity: ethnicityInfo.ethnicity,
    ethnicityname: ethnicityInfo.ethnicityname,
    language6392code: patient.language,
    guarantorrelationshiptopatient: 'self',
    primaryproviderid: provider.id,
    registrationdate: formatDate(faker.date.past({ years: 5 })),
    lastappointment: faker.datatype.boolean({ probability: 0.8 }) ? formatDate(faker.date.recent({ days: 90 })) : undefined,
  };

  // Add optional fields
  if (patient.middleName) {
    athenaPatient.middlename = patient.middleName;
  }

  if (faker.datatype.boolean({ probability: 0.6 })) {
    athenaPatient.ssn = patient.ssn.replace(/-/g, '');
  }

  // Add insurance for most patients
  if (faker.datatype.boolean({ probability: 0.85 })) {
    athenaPatient.insurances = [{
      insuranceid: faker.string.numeric(8),
      insurancepackageid: faker.string.numeric(6),
      insuranceplanname: faker.helpers.arrayElement([
        'Blue Cross Blue Shield PPO',
        'Aetna HMO',
        'United Healthcare Choice Plus',
        'Cigna Open Access Plus',
        'Medicare Part B',
        'Medicaid',
      ]),
      insurancepolicyholder: `${patient.firstName} ${patient.lastName}`,
      relationshiptoinsured: 'self',
      sequencenumber: 1,
      eligibilitystatus: faker.helpers.arrayElement(['Eligible', 'Eligible', 'Eligible', 'Unknown']),
      eligibilitylastchecked: formatDateTime(faker.date.recent({ days: 30 })),
    }];
  }

  // Add balance for some patients
  if (faker.datatype.boolean({ probability: 0.3 })) {
    athenaPatient.balances = [{
      balance: faker.number.float({ min: 0, max: 500, fractionDigits: 2 }),
      providergroupid: faker.string.numeric(4),
      cleanbalance: faker.datatype.boolean({ probability: 0.8 }),
    }];
  }

  return athenaPatient;
}

/**
 * Generate an Athena Appointment
 */
export function generateAthenaAppointment(patientId?: string): AthenaAppointment {
  const patient = patientId || faker.string.numeric(7);
  const provider = generateProvider();
  const appointmentDate = faker.date.recent({ days: 60 });
  const duration = faker.helpers.arrayElement([15, 30, 45, 60]);
  const status = faker.helpers.arrayElement(['Scheduled', 'Checked In', 'Checked Out', 'Cancelled', 'No Show']);

  const appointment: AthenaAppointment = {
    appointmentid: faker.string.numeric(8),
    patientid: patient,
    departmentid: faker.string.numeric(5),
    appointmenttype: faker.helpers.arrayElement([
      'New Patient',
      'Follow Up',
      'Annual Wellness',
      'Sick Visit',
      'Telehealth',
      'Procedure',
    ]),
    appointmenttypeid: faker.string.numeric(4),
    date: formatDate(appointmentDate),
    starttime: `${faker.number.int({ min: 8, max: 17 }).toString().padStart(2, '0')}:${faker.helpers.arrayElement(['00', '15', '30', '45'])}`,
    duration,
    appointmentstatus: status,
    providerid: provider.id,
    providerfirstname: provider.firstName,
    providerlastname: provider.lastName,
    reasonid: faker.string.numeric(4),
    reason: faker.helpers.arrayElement([
      'Annual Physical',
      'Follow-up visit',
      'New symptoms',
      'Medication refill',
      'Lab review',
      'Chronic disease management',
    ]),
    scheduledby: faker.person.fullName(),
    scheduleddatetime: formatDateTime(faker.date.past({ years: 1 })),
  };

  if (status === 'Checked In' || status === 'Checked Out') {
    appointment.checkindatetime = formatDateTime(appointmentDate);
    if (status === 'Checked Out') {
      const checkoutTime = new Date(appointmentDate.getTime() + duration * 60000);
      appointment.checkoutdatetime = formatDateTime(checkoutTime);
      appointment.encounterid = faker.string.numeric(9);
      appointment.encounterstatus = 'CLOSED';
    }
  }

  if (faker.datatype.boolean({ probability: 0.4 })) {
    appointment.copay = faker.helpers.arrayElement([20, 25, 30, 40, 50]);
  }

  return appointment;
}

/**
 * Generate an Athena Encounter
 */
export function generateAthenaEncounter(patientId?: string): AthenaEncounter {
  const patient = patientId || faker.string.numeric(7);
  const provider = generateProvider();
  const encounterDate = faker.date.recent({ days: 90 });
  const isClosed = faker.datatype.boolean({ probability: 0.7 });

  const encounter: AthenaEncounter = {
    encounterid: faker.string.numeric(9),
    patientid: patient,
    departmentid: faker.string.numeric(5),
    appointmentid: faker.datatype.boolean({ probability: 0.9 }) ? faker.string.numeric(8) : undefined,
    encountertype: faker.helpers.arrayElement(['OFFICE', 'TELEHEALTH', 'INPATIENT', 'EMERGENCY', 'HOME VISIT']),
    encounterstatus: isClosed ? 'CLOSED' : 'OPEN',
    encounterdate: formatDate(encounterDate),
    providerid: provider.id,
    providerfirstname: provider.firstName,
    providerlastname: provider.lastName,
    stage: isClosed ? 'CHECKED OUT' : faker.helpers.arrayElement(['INTAKE', 'NURSE', 'PROVIDER', 'CHECKOUT']),
  };

  if (isClosed) {
    encounter.closeddatetime = formatDateTime(encounterDate);
  }

  // Add diagnoses for closed encounters
  if (isClosed && faker.datatype.boolean({ probability: 0.8 })) {
    const numDiagnoses = faker.number.int({ min: 1, max: 4 });
    encounter.diagnoses = Array.from({ length: numDiagnoses }, (_, i) => {
      const diagnosis = generateDiagnosis();
      return {
        icd10code: diagnosis.code,
        description: diagnosis.display,
        sequence: i + 1,
        diagnosissnowmedid: faker.string.numeric(8),
      };
    });
  }

  return encounter;
}

/**
 * Generate Athena Vitals
 */
export function generateAthenaVitals(patientId?: string, encounterId?: string): AthenaVitals {
  const vitals = Array.from({ length: faker.number.int({ min: 4, max: 8 }) }, () => generateVitalSign());

  return {
    vitalid: faker.string.numeric(10),
    patientid: patientId || faker.string.numeric(7),
    departmentid: faker.string.numeric(5),
    encounterid: encounterId || faker.string.numeric(9),
    readingdatetime: formatDateTime(faker.date.recent({ days: 30 })),
    vitals: vitals.map(v => ({
      vitalname: v.display,
      vitalvalue: v.value.toString(),
      vitalunits: v.unit,
      source: faker.helpers.arrayElement(['EHR', 'DEVICE', 'PATIENT REPORTED']),
    })),
  };
}

/**
 * Generate Athena Lab Result
 */
export function generateAthenaLabResult(patientId?: string): AthenaLabResult {
  const orderedDate = faker.date.recent({ days: 14 });
  const resultDate = new Date(orderedDate.getTime() + faker.number.int({ min: 1, max: 3 }) * 24 * 60 * 60 * 1000);
  const labTests = Array.from({ length: faker.number.int({ min: 5, max: 12 }) }, () => generateLabTest());

  const panelName = faker.helpers.arrayElement([
    'Comprehensive Metabolic Panel',
    'Complete Blood Count with Differential',
    'Lipid Panel',
    'Basic Metabolic Panel',
    'Thyroid Panel',
  ]);

  return {
    labresultid: faker.string.numeric(10),
    patientid: patientId || faker.string.numeric(7),
    departmentid: faker.string.numeric(5),
    orderid: faker.string.numeric(9),
    ordereddate: formatDate(orderedDate),
    resultdate: formatDate(resultDate),
    resultstatus: 'FINAL',
    facilityid: faker.string.numeric(5),
    performinglabname: faker.helpers.arrayElement([
      'Quest Diagnostics',
      'LabCorp',
      'ARUP Laboratories',
      'Mayo Clinic Laboratories',
    ]),
    panels: [{
      panelname: panelName,
      loinccode: faker.helpers.arrayElement(['24323-8', '57021-8', '24362-6', '55399-0']),
      analytes: labTests.map(test => ({
        analytename: test.display,
        analytevalue: test.value.toString(),
        units: test.unit,
        referencerange: `${test.low}-${test.high}`,
        abnormalflag: test.isAbnormal ? test.interpretation : undefined,
        loinccode: test.code,
      })),
    }],
  };
}

/**
 * Generate Athena Problem
 */
export function generateAthenaProblem(patientId?: string): AthenaProblem {
  const diagnosis = generateDiagnosis();
  const status = faker.helpers.arrayElement(['ACTIVE', 'CHRONIC', 'RESOLVED', 'INACTIVE'] as const);

  return {
    problemid: faker.string.numeric(8),
    patientid: patientId || faker.string.numeric(7),
    departmentid: faker.string.numeric(5),
    snomedcode: faker.string.numeric(9),
    icd10code: diagnosis.code,
    name: diagnosis.display,
    onsetdate: status !== 'RESOLVED' ? formatDate(faker.date.past({ years: 5 })) : undefined,
    status,
    lastmodifieddatetime: formatDateTime(faker.date.recent({ days: 180 })),
    source: faker.helpers.arrayElement(['EHR', 'PATIENT', 'EXTERNAL']),
    note: faker.datatype.boolean({ probability: 0.3 }) ? faker.lorem.sentence() : undefined,
  };
}

/**
 * Generate Athena Allergy
 */
export function generateAthenaAllergy(patientId?: string): AthenaAllergy {
  const allergy = generateAllergy();

  return {
    allergyid: faker.string.numeric(7),
    patientid: patientId || faker.string.numeric(7),
    departmentid: faker.string.numeric(5),
    allergenname: allergy.display,
    allergenid: allergy.code,
    reactions: [allergy.reaction],
    severity: faker.helpers.arrayElement(['mild', 'moderate', 'severe']),
    status: faker.helpers.arrayElement(['active', 'inactive']),
    onsetdate: faker.datatype.boolean({ probability: 0.6 }) ? formatDate(faker.date.past({ years: 10 })) : undefined,
    note: faker.datatype.boolean({ probability: 0.2 }) ? faker.lorem.sentence() : undefined,
  };
}

/**
 * Generate Athena Medication
 */
export function generateAthenaMedication(patientId?: string): AthenaMedication {
  const medication = generateMedication();
  const provider = generateProvider();
  const status = faker.helpers.arrayElement(['active', 'discontinued', 'completed'] as const);
  const prescribedDate = faker.date.past({ years: 1 });

  return {
    medicationid: faker.string.numeric(8),
    patientid: patientId || faker.string.numeric(7),
    departmentid: faker.string.numeric(5),
    medication: medication.display,
    medicationcode: medication.rxnorm,
    sig: `Take ${medication.dosage} ${medication.frequency}`,
    quantity: faker.number.int({ min: 30, max: 90 }),
    quantityunit: 'tablets',
    refills: faker.number.int({ min: 0, max: 5 }),
    prescribedby: `${provider.firstName} ${provider.lastName}`,
    prescribeddatetime: formatDateTime(prescribedDate),
    startdate: formatDate(prescribedDate),
    stopdate: status !== 'active' ? formatDate(faker.date.recent({ days: 30 })) : undefined,
    status,
    source: faker.helpers.arrayElement(['ehr', 'patient-reported', 'external']),
  };
}

/**
 * Generate a complete Athena patient with all related data
 */
export function generateCompleteAthenaPatient(): {
  patient: AthenaPatient;
  appointments: AthenaAppointment[];
  encounters: AthenaEncounter[];
  problems: AthenaProblem[];
  allergies: AthenaAllergy[];
  medications: AthenaMedication[];
  vitals: AthenaVitals[];
  labResults: AthenaLabResult[];
} {
  const patient = generateAthenaPatient();
  const patientId = patient.patientid;

  const numAppointments = faker.number.int({ min: 1, max: 5 });
  const numEncounters = faker.number.int({ min: 1, max: 4 });
  const numProblems = faker.number.int({ min: 0, max: 4 });
  const numAllergies = faker.number.int({ min: 0, max: 3 });
  const numMedications = faker.number.int({ min: 0, max: 6 });
  const numVitals = faker.number.int({ min: 1, max: 3 });
  const numLabResults = faker.number.int({ min: 0, max: 2 });

  return {
    patient,
    appointments: Array.from({ length: numAppointments }, () => generateAthenaAppointment(patientId)),
    encounters: Array.from({ length: numEncounters }, () => generateAthenaEncounter(patientId)),
    problems: Array.from({ length: numProblems }, () => generateAthenaProblem(patientId)),
    allergies: Array.from({ length: numAllergies }, () => generateAthenaAllergy(patientId)),
    medications: Array.from({ length: numMedications }, () => generateAthenaMedication(patientId)),
    vitals: Array.from({ length: numVitals }, () => generateAthenaVitals(patientId)),
    labResults: Array.from({ length: numLabResults }, () => generateAthenaLabResult(patientId)),
  };
}

/**
 * Generate multiple Athena patients
 */
export function generateAthenaPatients(count: number = 10): AthenaPatient[] {
  return Array.from({ length: count }, () => generateAthenaPatient());
}
