import {
  faker,
  generatePatientData,
  generateAllergy,
  generateMedication,
  generateDiagnosis,
  generateLabTest,
  generateProvider,
  formatDate,
  formatDateTime,
} from './utils.js';

// Elation-specific types matching their REST API format
export interface ElationPatient {
  id: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  nickname?: string;
  sex: 'Male' | 'Female' | 'Other' | 'Unknown';
  dob: string;
  ssn?: string;
  primary_physician: number;
  caregiver_practice: number;
  address: ElationAddress;
  phones: ElationPhone[];
  emails: ElationEmail[];
  emergency_contact?: ElationEmergencyContact;
  insurance_info?: ElationInsurance[];
  race?: string;
  ethnicity?: string;
  preferred_language?: string;
  marital_status?: string;
  mrn?: string;
  chart_number?: string;
  created_date: string;
  last_modified_date: string;
  status: 'active' | 'inactive' | 'deceased';
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface ElationAddress {
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface ElationPhone {
  phone: string;
  phone_type: 'Mobile' | 'Home' | 'Work' | 'Fax';
  is_primary: boolean;
}

export interface ElationEmail {
  email: string;
  is_primary: boolean;
}

export interface ElationEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface ElationInsurance {
  id: number;
  insurance_company: string;
  plan_name: string;
  group_id: string;
  member_id: string;
  subscriber_name: string;
  subscriber_dob: string;
  relationship_to_subscriber: string;
  rank: 'Primary' | 'Secondary' | 'Tertiary';
  effective_date: string;
  termination_date?: string;
}

export interface ElationAppointment {
  id: number;
  patient: number;
  physician: number;
  practice: number;
  scheduled_date: string;
  duration: number;
  reason: string;
  appointment_type: ElationAppointmentType;
  status: ElationAppointmentStatus;
  service_location: number;
  telehealth?: boolean;
  telehealth_details?: {
    provider_url: string;
    patient_url: string;
  };
  notes?: string;
  created_date: string;
  last_modified_date: string;
}

export interface ElationAppointmentType {
  id: number;
  name: string;
  duration: number;
  color: string;
}

export type ElationAppointmentStatus =
  | 'Scheduled'
  | 'Confirmed'
  | 'Checked In'
  | 'Roomed'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled'
  | 'No Show';

export interface ElationVisitNote {
  id: number;
  patient: number;
  physician: number;
  practice: number;
  document_date: string;
  visit_type: string;
  chief_complaint: string;
  hpi?: string;
  ros?: ElationROS;
  physical_exam?: ElationPhysicalExam;
  assessment: string;
  plan: string;
  icd10_codes: ElationDiagnosisCode[];
  cpt_codes?: ElationCPTCode[];
  vitals?: ElationVitals;
  signed: boolean;
  signed_by?: number;
  signed_date?: string;
  created_date: string;
  last_modified_date: string;
}

export interface ElationROS {
  constitutional?: string;
  eyes?: string;
  ent?: string;
  cardiovascular?: string;
  respiratory?: string;
  gi?: string;
  gu?: string;
  musculoskeletal?: string;
  skin?: string;
  neurological?: string;
  psychiatric?: string;
  endocrine?: string;
  hematologic_lymphatic?: string;
  allergic_immunologic?: string;
}

export interface ElationPhysicalExam {
  general?: string;
  heent?: string;
  neck?: string;
  chest_lungs?: string;
  cardiovascular?: string;
  abdomen?: string;
  extremities?: string;
  skin?: string;
  neurological?: string;
  psychiatric?: string;
}

export interface ElationDiagnosisCode {
  code: string;
  description: string;
  rank: number;
}

export interface ElationCPTCode {
  code: string;
  description: string;
  quantity: number;
  modifiers?: string[];
}

export interface ElationVitals {
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  temperature?: number;
  temperature_unit?: 'F' | 'C';
  height?: number;
  height_unit?: 'in' | 'cm';
  weight?: number;
  weight_unit?: 'lb' | 'kg';
  bmi?: number;
  oxygen_saturation?: number;
  pain_level?: number;
}

export interface ElationProblem {
  id: number;
  patient: number;
  icd10_code: string;
  description: string;
  status: 'Active' | 'Resolved' | 'Inactive';
  onset_date?: string;
  resolved_date?: string;
  notes?: string;
  created_date: string;
  last_modified_date: string;
}

export interface ElationAllergy {
  id: number;
  patient: number;
  allergen: string;
  allergen_type: 'Drug' | 'Food' | 'Environmental' | 'Other';
  reaction?: string;
  severity?: 'Mild' | 'Moderate' | 'Severe' | 'Life-threatening';
  status: 'Active' | 'Inactive';
  onset_date?: string;
  notes?: string;
  created_date: string;
  last_modified_date: string;
}

export interface ElationMedication {
  id: number;
  patient: number;
  drug_name: string;
  ndc?: string;
  rxnorm?: string;
  sig: string;
  quantity: number;
  quantity_unit: string;
  refills: number;
  days_supply: number;
  prescribed_date: string;
  prescribed_by: number;
  pharmacy?: ElationPharmacy;
  status: 'Active' | 'Discontinued' | 'Completed';
  discontinue_reason?: string;
  created_date: string;
  last_modified_date: string;
}

export interface ElationPharmacy {
  id: number;
  name: string;
  address: string;
  phone: string;
  fax?: string;
  ncpdp_id?: string;
}

export interface ElationLabOrder {
  id: number;
  patient: number;
  ordering_physician: number;
  practice: number;
  order_date: string;
  collection_date?: string;
  result_date?: string;
  status: 'Ordered' | 'Collected' | 'In Progress' | 'Final' | 'Cancelled';
  priority: 'Routine' | 'Urgent' | 'STAT';
  lab_name: string;
  tests: ElationLabTest[];
  results?: ElationLabResult[];
  notes?: string;
  created_date: string;
  last_modified_date: string;
}

export interface ElationLabTest {
  code: string;
  name: string;
  loinc_code?: string;
}

export interface ElationLabResult {
  test_code: string;
  test_name: string;
  value: string;
  unit: string;
  reference_range: string;
  abnormal_flag?: 'L' | 'H' | 'A' | 'N';
  loinc_code: string;
}

// Helper functions
function toElationGender(gender: string): 'Male' | 'Female' | 'Other' | 'Unknown' {
  switch (gender) {
    case 'male': return 'Male';
    case 'female': return 'Female';
    case 'other': return 'Other';
    default: return 'Unknown';
  }
}

function toElationMaritalStatus(status: string): string {
  const map: Record<string, string> = {
    'S': 'Single',
    'M': 'Married',
    'D': 'Divorced',
    'W': 'Widowed',
  };
  return map[status] || 'Unknown';
}

function toElationRace(code: string): string {
  const races: Record<string, string> = {
    '2106-3': 'White',
    '2054-5': 'Black or African American',
    '2028-9': 'Asian',
    '2076-8': 'Native Hawaiian or Other Pacific Islander',
    '2131-1': 'Other',
  };
  return races[code] || 'Unknown';
}

function toElationEthnicity(code: string): string {
  return code === '2135-2' ? 'Hispanic or Latino' : 'Not Hispanic or Latino';
}

/**
 * Generate an Elation Patient
 */
export function generateElationPatient(): ElationPatient {
  const patient = generatePatientData('ELA-');
  const provider = generateProvider();
  const now = new Date();

  const elationPatient: ElationPatient = {
    id: faker.number.int({ min: 100000, max: 9999999 }),
    first_name: patient.firstName,
    last_name: patient.lastName,
    sex: toElationGender(patient.gender),
    dob: formatDate(patient.dob),
    primary_physician: faker.number.int({ min: 1000, max: 9999 }),
    caregiver_practice: faker.number.int({ min: 100, max: 999 }),
    address: {
      address_line1: patient.address.street,
      city: patient.address.city,
      state: patient.address.state,
      zip: patient.address.postalCode,
      country: patient.address.country,
    },
    phones: [{
      phone: patient.phone.replace(/\D/g, ''),
      phone_type: 'Mobile',
      is_primary: true,
    }],
    emails: [{
      email: patient.email,
      is_primary: true,
    }],
    race: toElationRace(patient.race),
    ethnicity: toElationEthnicity(patient.ethnicity),
    preferred_language: patient.language,
    marital_status: toElationMaritalStatus(patient.maritalStatus),
    mrn: patient.mrn,
    chart_number: `CHT${faker.string.numeric(6)}`,
    created_date: formatDateTime(faker.date.past({ years: 3 })),
    last_modified_date: formatDateTime(faker.date.recent({ days: 90 })),
    status: faker.helpers.arrayElement(['active', 'active', 'active', 'inactive']),
  };

  if (patient.middleName) {
    elationPatient.middle_name = patient.middleName;
  }

  if (faker.datatype.boolean({ probability: 0.5 })) {
    elationPatient.ssn = patient.ssn.replace(/-/g, '');
  }

  // Add home phone sometimes
  if (faker.datatype.boolean({ probability: 0.6 })) {
    elationPatient.phones.push({
      phone: faker.string.numeric(10),
      phone_type: 'Home',
      is_primary: false,
    });
  }

  // Add emergency contact
  if (faker.datatype.boolean({ probability: 0.7 })) {
    elationPatient.emergency_contact = {
      name: faker.person.fullName(),
      relationship: faker.helpers.arrayElement(['Spouse', 'Parent', 'Child', 'Sibling', 'Friend']),
      phone: faker.string.numeric(10),
    };
  }

  // Add insurance
  if (faker.datatype.boolean({ probability: 0.85 })) {
    elationPatient.insurance_info = [{
      id: faker.number.int({ min: 10000, max: 99999 }),
      insurance_company: faker.helpers.arrayElement([
        'Blue Cross Blue Shield',
        'Aetna',
        'United Healthcare',
        'Cigna',
        'Humana',
      ]),
      plan_name: faker.helpers.arrayElement(['PPO', 'HMO', 'EPO', 'POS']),
      group_id: faker.string.alphanumeric(8).toUpperCase(),
      member_id: faker.string.alphanumeric(12).toUpperCase(),
      subscriber_name: `${patient.firstName} ${patient.lastName}`,
      subscriber_dob: formatDate(patient.dob),
      relationship_to_subscriber: 'Self',
      rank: 'Primary',
      effective_date: formatDate(faker.date.past({ years: 2 })),
    }];
  }

  // Add tags
  if (faker.datatype.boolean({ probability: 0.4 })) {
    elationPatient.tags = faker.helpers.arrayElements([
      'VIP', 'High Risk', 'Diabetic', 'Hypertensive', 'Chronic Pain', 'Pregnant', 'Medicare'
    ], { min: 1, max: 3 });
  }

  return elationPatient;
}

/**
 * Generate an Elation Appointment
 */
export function generateElationAppointment(patientId?: number): ElationAppointment {
  const appointmentDate = faker.date.recent({ days: 60 });
  const duration = faker.helpers.arrayElement([15, 30, 45, 60]);
  const status = faker.helpers.arrayElement([
    'Scheduled', 'Confirmed', 'Checked In', 'Roomed', 'In Progress', 'Completed', 'Cancelled', 'No Show'
  ] as ElationAppointmentStatus[]);
  const isTelehealth = faker.datatype.boolean({ probability: 0.3 });

  const appointment: ElationAppointment = {
    id: faker.number.int({ min: 100000, max: 9999999 }),
    patient: patientId || faker.number.int({ min: 100000, max: 9999999 }),
    physician: faker.number.int({ min: 1000, max: 9999 }),
    practice: faker.number.int({ min: 100, max: 999 }),
    scheduled_date: formatDateTime(appointmentDate),
    duration,
    reason: faker.helpers.arrayElement([
      'Annual Physical',
      'Follow-up Visit',
      'New Patient Consult',
      'Sick Visit',
      'Medication Review',
      'Lab Review',
      'Chronic Care Visit',
    ]),
    appointment_type: {
      id: faker.number.int({ min: 1, max: 20 }),
      name: faker.helpers.arrayElement([
        'New Patient', 'Follow Up', 'Wellness Visit', 'Sick Visit', 'Telehealth', 'Procedure'
      ]),
      duration,
      color: faker.helpers.arrayElement(['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#E91E63']),
    },
    status,
    service_location: faker.number.int({ min: 1, max: 10 }),
    telehealth: isTelehealth,
    created_date: formatDateTime(faker.date.past({ years: 1 })),
    last_modified_date: formatDateTime(faker.date.recent({ days: 7 })),
  };

  if (isTelehealth) {
    appointment.telehealth_details = {
      provider_url: `https://telehealth.elation.com/provider/${faker.string.uuid()}`,
      patient_url: `https://telehealth.elation.com/patient/${faker.string.uuid()}`,
    };
  }

  if (faker.datatype.boolean({ probability: 0.3 })) {
    appointment.notes = faker.lorem.sentence();
  }

  return appointment;
}

/**
 * Generate an Elation Visit Note
 */
export function generateElationVisitNote(patientId?: number): ElationVisitNote {
  const documentDate = faker.date.recent({ days: 90 });
  const isSigned = faker.datatype.boolean({ probability: 0.7 });
  const diagnoses = Array.from(
    { length: faker.number.int({ min: 1, max: 4 }) },
    (_, i) => {
      const diag = generateDiagnosis();
      return { code: diag.code, description: diag.display, rank: i + 1 };
    }
  );
  const vitals = generateElationVitals();

  const visitNote: ElationVisitNote = {
    id: faker.number.int({ min: 100000, max: 9999999 }),
    patient: patientId || faker.number.int({ min: 100000, max: 9999999 }),
    physician: faker.number.int({ min: 1000, max: 9999 }),
    practice: faker.number.int({ min: 100, max: 999 }),
    document_date: formatDate(documentDate),
    visit_type: faker.helpers.arrayElement([
      'Office Visit', 'Follow-up', 'Annual Wellness', 'Sick Visit', 'Telehealth'
    ]),
    chief_complaint: faker.helpers.arrayElement([
      'Routine follow-up',
      'Cough and congestion',
      'Abdominal pain',
      'Annual physical exam',
      'Medication refill',
      'Blood pressure check',
    ]),
    hpi: faker.lorem.paragraph(),
    assessment: diagnoses.map(d => `${d.code}: ${d.description}`).join('\n'),
    plan: faker.lorem.sentences(3),
    icd10_codes: diagnoses,
    vitals,
    signed: isSigned,
    created_date: formatDateTime(documentDate),
    last_modified_date: formatDateTime(faker.date.recent({ days: 7 })),
  };

  if (isSigned) {
    visitNote.signed_by = faker.number.int({ min: 1000, max: 9999 });
    visitNote.signed_date = formatDateTime(documentDate);
  }

  // Add ROS sometimes
  if (faker.datatype.boolean({ probability: 0.6 })) {
    visitNote.ros = {
      constitutional: faker.helpers.arrayElement(['Negative', 'Fatigue', 'Weight loss']),
      cardiovascular: faker.helpers.arrayElement(['Negative', 'Chest pain', 'Palpitations']),
      respiratory: faker.helpers.arrayElement(['Negative', 'Shortness of breath', 'Cough']),
      gi: faker.helpers.arrayElement(['Negative', 'Nausea', 'Abdominal pain']),
    };
  }

  // Add Physical Exam
  if (faker.datatype.boolean({ probability: 0.7 })) {
    visitNote.physical_exam = {
      general: 'Alert and oriented, in no acute distress',
      heent: 'Normocephalic, PERRLA, oropharynx clear',
      cardiovascular: 'Regular rate and rhythm, no murmurs',
      chest_lungs: 'Clear to auscultation bilaterally',
      abdomen: 'Soft, non-tender, non-distended',
    };
  }

  // Add CPT codes
  if (faker.datatype.boolean({ probability: 0.8 })) {
    visitNote.cpt_codes = [{
      code: faker.helpers.arrayElement(['99213', '99214', '99215', '99203', '99204', '99395', '99396']),
      description: 'Office/outpatient visit',
      quantity: 1,
    }];
  }

  return visitNote;
}

function generateElationVitals(): ElationVitals {
  return {
    blood_pressure_systolic: faker.number.int({ min: 90, max: 160 }),
    blood_pressure_diastolic: faker.number.int({ min: 60, max: 100 }),
    heart_rate: faker.number.int({ min: 60, max: 100 }),
    respiratory_rate: faker.number.int({ min: 12, max: 20 }),
    temperature: faker.number.float({ min: 97.0, max: 99.5, fractionDigits: 1 }),
    temperature_unit: 'F',
    height: faker.number.int({ min: 60, max: 76 }),
    height_unit: 'in',
    weight: faker.number.float({ min: 100, max: 250, fractionDigits: 1 }),
    weight_unit: 'lb',
    oxygen_saturation: faker.number.int({ min: 95, max: 100 }),
    pain_level: faker.datatype.boolean({ probability: 0.3 }) ? faker.number.int({ min: 0, max: 10 }) : undefined,
  };
}

/**
 * Generate an Elation Problem
 */
export function generateElationProblem(patientId?: number): ElationProblem {
  const diagnosis = generateDiagnosis();
  const status = faker.helpers.arrayElement(['Active', 'Resolved', 'Inactive'] as const);
  const onsetDate = faker.date.past({ years: 5 });

  return {
    id: faker.number.int({ min: 100000, max: 9999999 }),
    patient: patientId || faker.number.int({ min: 100000, max: 9999999 }),
    icd10_code: diagnosis.code,
    description: diagnosis.display,
    status,
    onset_date: formatDate(onsetDate),
    resolved_date: status === 'Resolved' ? formatDate(faker.date.recent({ days: 90 })) : undefined,
    notes: faker.datatype.boolean({ probability: 0.3 }) ? faker.lorem.sentence() : undefined,
    created_date: formatDateTime(onsetDate),
    last_modified_date: formatDateTime(faker.date.recent({ days: 30 })),
  };
}

/**
 * Generate an Elation Allergy
 */
export function generateElationAllergy(patientId?: number): ElationAllergy {
  const allergy = generateAllergy();

  return {
    id: faker.number.int({ min: 100000, max: 9999999 }),
    patient: patientId || faker.number.int({ min: 100000, max: 9999999 }),
    allergen: allergy.display,
    allergen_type: faker.helpers.arrayElement(['Drug', 'Food', 'Environmental', 'Other']),
    reaction: allergy.reaction,
    severity: faker.helpers.arrayElement(['Mild', 'Moderate', 'Severe', 'Life-threatening']),
    status: faker.helpers.arrayElement(['Active', 'Inactive']),
    onset_date: faker.datatype.boolean({ probability: 0.6 }) ? formatDate(faker.date.past({ years: 10 })) : undefined,
    notes: faker.datatype.boolean({ probability: 0.2 }) ? faker.lorem.sentence() : undefined,
    created_date: formatDateTime(faker.date.past({ years: 2 })),
    last_modified_date: formatDateTime(faker.date.recent({ days: 60 })),
  };
}

/**
 * Generate an Elation Medication
 */
export function generateElationMedication(patientId?: number): ElationMedication {
  const medication = generateMedication();
  const prescribedDate = faker.date.past({ years: 1 });
  const status = faker.helpers.arrayElement(['Active', 'Discontinued', 'Completed'] as const);

  return {
    id: faker.number.int({ min: 100000, max: 9999999 }),
    patient: patientId || faker.number.int({ min: 100000, max: 9999999 }),
    drug_name: medication.display,
    rxnorm: medication.rxnorm,
    sig: `Take ${medication.dosage} ${medication.frequency}`,
    quantity: faker.number.int({ min: 30, max: 90 }),
    quantity_unit: 'tablets',
    refills: faker.number.int({ min: 0, max: 5 }),
    days_supply: faker.number.int({ min: 30, max: 90 }),
    prescribed_date: formatDate(prescribedDate),
    prescribed_by: faker.number.int({ min: 1000, max: 9999 }),
    status,
    discontinue_reason: status === 'Discontinued' ? faker.helpers.arrayElement([
      'No longer needed', 'Side effects', 'Ineffective', 'Patient request', 'Changed medication'
    ]) : undefined,
    created_date: formatDateTime(prescribedDate),
    last_modified_date: formatDateTime(faker.date.recent({ days: 30 })),
  };
}

/**
 * Generate an Elation Lab Order
 */
export function generateElationLabOrder(patientId?: number): ElationLabOrder {
  const orderDate = faker.date.recent({ days: 14 });
  const hasResults = faker.datatype.boolean({ probability: 0.7 });
  const labTests = Array.from({ length: faker.number.int({ min: 3, max: 10 }) }, () => generateLabTest());

  const labOrder: ElationLabOrder = {
    id: faker.number.int({ min: 100000, max: 9999999 }),
    patient: patientId || faker.number.int({ min: 100000, max: 9999999 }),
    ordering_physician: faker.number.int({ min: 1000, max: 9999 }),
    practice: faker.number.int({ min: 100, max: 999 }),
    order_date: formatDate(orderDate),
    status: hasResults ? 'Final' : faker.helpers.arrayElement(['Ordered', 'Collected', 'In Progress']),
    priority: faker.helpers.arrayElement(['Routine', 'Urgent', 'STAT']),
    lab_name: faker.helpers.arrayElement([
      'Quest Diagnostics',
      'LabCorp',
      'ARUP Laboratories',
      'Mayo Clinic Laboratories',
    ]),
    tests: labTests.map(t => ({
      code: t.code,
      name: t.display,
      loinc_code: t.code,
    })),
    created_date: formatDateTime(orderDate),
    last_modified_date: formatDateTime(faker.date.recent({ days: 7 })),
  };

  if (hasResults) {
    labOrder.collection_date = formatDate(new Date(orderDate.getTime() + 24 * 60 * 60 * 1000));
    labOrder.result_date = formatDate(new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000));
    labOrder.results = labTests.map(t => ({
      test_code: t.code,
      test_name: t.display,
      value: t.value.toString(),
      unit: t.unit,
      reference_range: `${t.low}-${t.high}`,
      abnormal_flag: t.isAbnormal ? t.interpretation as 'L' | 'H' : 'N',
      loinc_code: t.code,
    }));
  }

  return labOrder;
}

/**
 * Generate a complete Elation patient with all related data
 */
export function generateCompleteElationPatient(): {
  patient: ElationPatient;
  appointments: ElationAppointment[];
  visitNotes: ElationVisitNote[];
  problems: ElationProblem[];
  allergies: ElationAllergy[];
  medications: ElationMedication[];
  labOrders: ElationLabOrder[];
} {
  const patient = generateElationPatient();
  const patientId = patient.id;

  return {
    patient,
    appointments: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => generateElationAppointment(patientId)),
    visitNotes: Array.from({ length: faker.number.int({ min: 1, max: 4 }) }, () => generateElationVisitNote(patientId)),
    problems: Array.from({ length: faker.number.int({ min: 0, max: 4 }) }, () => generateElationProblem(patientId)),
    allergies: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => generateElationAllergy(patientId)),
    medications: Array.from({ length: faker.number.int({ min: 0, max: 6 }) }, () => generateElationMedication(patientId)),
    labOrders: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => generateElationLabOrder(patientId)),
  };
}

/**
 * Generate multiple Elation patients
 */
export function generateElationPatients(count: number = 10): ElationPatient[] {
  return Array.from({ length: count }, () => generateElationPatient());
}
