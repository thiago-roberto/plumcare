import {
  faker,
  generatePatientData,
  generateAllergy,
  generateMedication,
  generateDiagnosis,
  generateLabTest,
  generateProvider,
  generateUUID,
  formatDate,
  formatDateTime,
} from './utils.js';

// NextGen-specific types matching their REST API format
export interface NextGenPatient {
  person_id: string;
  enterprise_id: string;
  practice_id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  preferred_name?: string;
  date_of_birth: string;
  gender: 'M' | 'F' | 'O' | 'U';
  ssn?: string;
  mrn: string;
  email_address?: string;
  home_phone?: string;
  mobile_phone?: string;
  work_phone?: string;
  address: NextGenAddress;
  marital_status_code?: string;
  race_code?: string;
  ethnicity_code?: string;
  preferred_language?: string;
  primary_care_provider_id?: string;
  registration_date: string;
  last_visit_date?: string;
  next_appointment_date?: string;
  patient_status: 'Active' | 'Inactive' | 'Deceased' | 'Merged';
  payer_information?: NextGenPayer[];
  custom_demographics?: Record<string, string>;
  created_timestamp: string;
  modified_timestamp: string;
}

export interface NextGenAddress {
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state_code: string;
  postal_code: string;
  country_code: string;
  address_type: 'Home' | 'Work' | 'Mailing' | 'Temporary';
}

export interface NextGenPayer {
  payer_id: string;
  payer_name: string;
  plan_name: string;
  group_number: string;
  member_id: string;
  subscriber_id: string;
  subscriber_relationship: string;
  priority: number;
  effective_date: string;
  termination_date?: string;
  copay_amount?: number;
  deductible_amount?: number;
  eligibility_status: 'Verified' | 'Not Verified' | 'Pending' | 'Denied';
  last_verification_date?: string;
}

export interface NextGenAppointment {
  appointment_id: string;
  person_id: string;
  practice_id: string;
  location_id: string;
  provider_id: string;
  resource_id?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  appointment_type_id: string;
  appointment_type_name: string;
  appointment_status: NextGenAppointmentStatus;
  reason_for_visit?: string;
  chief_complaint?: string;
  check_in_time?: string;
  check_out_time?: string;
  encounter_id?: string;
  confirmation_status?: 'Confirmed' | 'Pending' | 'Left Message' | 'Not Confirmed';
  appointment_notes?: string;
  created_timestamp: string;
  modified_timestamp: string;
}

export type NextGenAppointmentStatus =
  | 'Scheduled'
  | 'Confirmed'
  | 'Arrived'
  | 'Ready'
  | 'In Exam'
  | 'Checkout'
  | 'Completed'
  | 'Cancelled'
  | 'No Show'
  | 'Rescheduled';

export interface NextGenEncounter {
  encounter_id: string;
  person_id: string;
  practice_id: string;
  location_id: string;
  rendering_provider_id: string;
  billing_provider_id?: string;
  supervising_provider_id?: string;
  appointment_id?: string;
  encounter_date: string;
  encounter_type: string;
  encounter_status: 'Open' | 'Closed' | 'Billed' | 'Void';
  service_location: string;
  place_of_service_code: string;
  chief_complaint?: string;
  diagnoses?: NextGenDiagnosis[];
  procedures?: NextGenProcedure[];
  vitals?: NextGenVitals;
  signed_by?: string;
  signed_date?: string;
  created_timestamp: string;
  modified_timestamp: string;
}

export interface NextGenDiagnosis {
  diagnosis_id: string;
  icd_code: string;
  icd_version: 'ICD-10' | 'ICD-9';
  description: string;
  diagnosis_type: 'Primary' | 'Secondary' | 'Admitting' | 'Discharge';
  sequence_number: number;
  onset_date?: string;
  resolved_date?: string;
}

export interface NextGenProcedure {
  procedure_id: string;
  cpt_code: string;
  description: string;
  quantity: number;
  modifiers?: string[];
  diagnosis_pointers?: number[];
  service_date: string;
  units: number;
}

export interface NextGenVitals {
  vitals_id: string;
  encounter_id?: string;
  recorded_date: string;
  recorded_by?: string;
  height_inches?: number;
  weight_lbs?: number;
  bmi?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  pulse_rate?: number;
  respiratory_rate?: number;
  temperature_fahrenheit?: number;
  oxygen_saturation?: number;
  pain_scale?: number;
  head_circumference_cm?: number;
}

export interface NextGenProblem {
  problem_id: string;
  person_id: string;
  practice_id: string;
  icd_code: string;
  icd_version: 'ICD-10' | 'ICD-9';
  snomed_code?: string;
  description: string;
  status: 'Active' | 'Inactive' | 'Resolved' | 'Chronic';
  priority: 'High' | 'Medium' | 'Low';
  onset_date?: string;
  resolution_date?: string;
  diagnosed_by?: string;
  last_reviewed_date?: string;
  notes?: string;
  created_timestamp: string;
  modified_timestamp: string;
}

export interface NextGenAllergy {
  allergy_id: string;
  person_id: string;
  practice_id: string;
  allergen_name: string;
  allergen_code?: string;
  allergen_code_system?: string;
  allergen_type: 'Drug' | 'Food' | 'Environment' | 'Latex' | 'Other';
  reaction_description?: string;
  reaction_severity: 'Mild' | 'Moderate' | 'Severe' | 'Fatal';
  status: 'Active' | 'Inactive' | 'Entered in Error';
  onset_date?: string;
  recorded_date: string;
  recorded_by?: string;
  verified: boolean;
  notes?: string;
  created_timestamp: string;
  modified_timestamp: string;
}

export interface NextGenMedication {
  medication_id: string;
  person_id: string;
  practice_id: string;
  drug_name: string;
  drug_code?: string;
  drug_code_system?: 'NDC' | 'RxNorm';
  dosage: string;
  dosage_form: string;
  route: string;
  frequency: string;
  quantity_prescribed?: number;
  quantity_unit?: string;
  refills_authorized?: number;
  refills_remaining?: number;
  days_supply?: number;
  prescription_date: string;
  start_date?: string;
  end_date?: string;
  prescribing_provider_id: string;
  pharmacy_id?: string;
  pharmacy_name?: string;
  status: 'Active' | 'Discontinued' | 'Completed' | 'On Hold';
  discontinue_reason?: string;
  sig: string;
  daw_code?: string;
  is_controlled_substance: boolean;
  created_timestamp: string;
  modified_timestamp: string;
}

export interface NextGenLabOrder {
  order_id: string;
  person_id: string;
  practice_id: string;
  encounter_id?: string;
  ordering_provider_id: string;
  order_date: string;
  order_status: 'Ordered' | 'Collected' | 'In Process' | 'Completed' | 'Cancelled';
  priority: 'Routine' | 'Urgent' | 'STAT' | 'ASAP';
  performing_lab_name?: string;
  performing_lab_id?: string;
  specimen_collection_date?: string;
  result_date?: string;
  order_tests: NextGenOrderTest[];
  results?: NextGenLabResult[];
  fasting_required?: boolean;
  special_instructions?: string;
  created_timestamp: string;
  modified_timestamp: string;
}

export interface NextGenOrderTest {
  test_id: string;
  test_code: string;
  test_name: string;
  loinc_code?: string;
  cpt_code?: string;
  diagnosis_codes?: string[];
}

export interface NextGenLabResult {
  result_id: string;
  test_code: string;
  test_name: string;
  result_value: string;
  result_unit: string;
  reference_range_low?: string;
  reference_range_high?: string;
  reference_range_text?: string;
  abnormal_flag?: 'N' | 'L' | 'H' | 'LL' | 'HH' | 'A';
  result_status: 'Preliminary' | 'Final' | 'Corrected' | 'Cancelled';
  loinc_code: string;
  performed_date: string;
  notes?: string;
}

// Helper functions
function toNextGenGender(gender: string): 'M' | 'F' | 'O' | 'U' {
  switch (gender) {
    case 'male': return 'M';
    case 'female': return 'F';
    case 'other': return 'O';
    default: return 'U';
  }
}

function toNextGenMaritalStatus(status: string): string {
  const map: Record<string, string> = {
    'S': 'SINGLE',
    'M': 'MARRIED',
    'D': 'DIVORCED',
    'W': 'WIDOWED',
  };
  return map[status] || 'UNKNOWN';
}

/**
 * Generate a NextGen Patient
 */
export function generateNextGenPatient(): NextGenPatient {
  const patient = generatePatientData('NXG-');
  const provider = generateProvider();
  const registrationDate = faker.date.past({ years: 5 });

  const nextgenPatient: NextGenPatient = {
    person_id: generateUUID(),
    enterprise_id: faker.string.alphanumeric(8).toUpperCase(),
    practice_id: faker.string.alphanumeric(6).toUpperCase(),
    first_name: patient.firstName,
    last_name: patient.lastName,
    date_of_birth: formatDate(patient.dob),
    gender: toNextGenGender(patient.gender),
    mrn: patient.mrn,
    email_address: patient.email,
    home_phone: patient.phone.replace(/\D/g, ''),
    address: {
      address_line_1: patient.address.street,
      city: patient.address.city,
      state_code: patient.address.state,
      postal_code: patient.address.postalCode,
      country_code: 'US',
      address_type: 'Home',
    },
    marital_status_code: toNextGenMaritalStatus(patient.maritalStatus),
    race_code: patient.race,
    ethnicity_code: patient.ethnicity,
    preferred_language: patient.language,
    primary_care_provider_id: provider.id,
    registration_date: formatDate(registrationDate),
    patient_status: faker.helpers.arrayElement(['Active', 'Active', 'Active', 'Inactive']),
    created_timestamp: formatDateTime(registrationDate),
    modified_timestamp: formatDateTime(faker.date.recent({ days: 90 })),
  };

  if (patient.middleName) {
    nextgenPatient.middle_name = patient.middleName;
  }

  if (faker.datatype.boolean({ probability: 0.5 })) {
    nextgenPatient.ssn = patient.ssn.replace(/-/g, '');
  }

  if (faker.datatype.boolean({ probability: 0.7 })) {
    nextgenPatient.mobile_phone = faker.string.numeric(10);
  }

  if (faker.datatype.boolean({ probability: 0.8 })) {
    nextgenPatient.last_visit_date = formatDate(faker.date.recent({ days: 180 }));
  }

  if (faker.datatype.boolean({ probability: 0.4 })) {
    nextgenPatient.next_appointment_date = formatDate(faker.date.future({ years: 1 }));
  }

  // Add payer information
  if (faker.datatype.boolean({ probability: 0.85 })) {
    nextgenPatient.payer_information = [{
      payer_id: faker.string.alphanumeric(8).toUpperCase(),
      payer_name: faker.helpers.arrayElement([
        'Blue Cross Blue Shield',
        'Aetna',
        'United Healthcare',
        'Cigna',
        'Humana',
        'Medicare',
        'Medicaid',
      ]),
      plan_name: faker.helpers.arrayElement(['PPO', 'HMO', 'EPO', 'POS', 'Medicare Part B', 'Medicaid']),
      group_number: faker.string.alphanumeric(10).toUpperCase(),
      member_id: faker.string.alphanumeric(12).toUpperCase(),
      subscriber_id: faker.string.alphanumeric(12).toUpperCase(),
      subscriber_relationship: 'Self',
      priority: 1,
      effective_date: formatDate(faker.date.past({ years: 2 })),
      copay_amount: faker.helpers.arrayElement([20, 25, 30, 40, 50]),
      deductible_amount: faker.helpers.arrayElement([500, 1000, 1500, 2000, 3000]),
      eligibility_status: faker.helpers.arrayElement(['Verified', 'Verified', 'Verified', 'Pending']),
      last_verification_date: formatDate(faker.date.recent({ days: 30 })),
    }];
  }

  return nextgenPatient;
}

/**
 * Generate a NextGen Appointment
 */
export function generateNextGenAppointment(personId?: string): NextGenAppointment {
  const appointmentDate = faker.date.recent({ days: 60 });
  const startHour = faker.number.int({ min: 8, max: 16 });
  const startMinute = faker.helpers.arrayElement([0, 15, 30, 45]);
  const duration = faker.helpers.arrayElement([15, 30, 45, 60]);
  const status = faker.helpers.arrayElement([
    'Scheduled', 'Confirmed', 'Arrived', 'Ready', 'In Exam', 'Checkout', 'Completed', 'Cancelled', 'No Show'
  ] as NextGenAppointmentStatus[]);

  const startTime = `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')}:00`;
  const endHour = startHour + Math.floor((startMinute + duration) / 60);
  const endMinute = (startMinute + duration) % 60;
  const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;

  const appointment: NextGenAppointment = {
    appointment_id: generateUUID(),
    person_id: personId || generateUUID(),
    practice_id: faker.string.alphanumeric(6).toUpperCase(),
    location_id: faker.string.alphanumeric(4).toUpperCase(),
    provider_id: faker.string.alphanumeric(6).toUpperCase(),
    appointment_date: formatDate(appointmentDate),
    start_time: startTime,
    end_time: endTime,
    duration_minutes: duration,
    appointment_type_id: faker.string.alphanumeric(4).toUpperCase(),
    appointment_type_name: faker.helpers.arrayElement([
      'New Patient',
      'Established Patient',
      'Annual Wellness Visit',
      'Follow Up',
      'Sick Visit',
      'Procedure',
      'Telehealth',
    ]),
    appointment_status: status,
    reason_for_visit: faker.helpers.arrayElement([
      'Annual Physical',
      'Follow-up visit',
      'New symptoms',
      'Medication review',
      'Lab review',
      'Chronic care management',
    ]),
    confirmation_status: faker.helpers.arrayElement(['Confirmed', 'Pending', 'Left Message']),
    created_timestamp: formatDateTime(faker.date.past({ years: 1 })),
    modified_timestamp: formatDateTime(faker.date.recent({ days: 7 })),
  };

  if (['Arrived', 'Ready', 'In Exam', 'Checkout', 'Completed'].includes(status)) {
    const checkinTime = new Date(appointmentDate);
    checkinTime.setHours(startHour, startMinute - faker.number.int({ min: 5, max: 15 }));
    appointment.check_in_time = formatDateTime(checkinTime);
  }

  if (status === 'Completed') {
    const checkoutTime = new Date(appointmentDate);
    checkoutTime.setHours(endHour, endMinute + faker.number.int({ min: 0, max: 15 }));
    appointment.check_out_time = formatDateTime(checkoutTime);
    appointment.encounter_id = generateUUID();
  }

  if (faker.datatype.boolean({ probability: 0.3 })) {
    appointment.appointment_notes = faker.lorem.sentence();
  }

  return appointment;
}

/**
 * Generate a NextGen Encounter
 */
export function generateNextGenEncounter(personId?: string): NextGenEncounter {
  const encounterDate = faker.date.recent({ days: 90 });
  const isClosed = faker.datatype.boolean({ probability: 0.7 });
  const provider = generateProvider();

  const encounter: NextGenEncounter = {
    encounter_id: generateUUID(),
    person_id: personId || generateUUID(),
    practice_id: faker.string.alphanumeric(6).toUpperCase(),
    location_id: faker.string.alphanumeric(4).toUpperCase(),
    rendering_provider_id: provider.id,
    encounter_date: formatDate(encounterDate),
    encounter_type: faker.helpers.arrayElement([
      'Office Visit',
      'Telehealth',
      'Hospital Visit',
      'Emergency',
      'Procedure',
      'Consultation',
    ]),
    encounter_status: isClosed ? faker.helpers.arrayElement(['Closed', 'Billed']) : 'Open',
    service_location: faker.helpers.arrayElement(['Office', 'Hospital', 'Telehealth', 'Home', 'Nursing Facility']),
    place_of_service_code: faker.helpers.arrayElement(['11', '21', '22', '23', '02']),
    chief_complaint: faker.helpers.arrayElement([
      'Routine follow-up',
      'Cough and congestion',
      'Abdominal pain',
      'Chest pain',
      'Headache',
      'Joint pain',
    ]),
    created_timestamp: formatDateTime(encounterDate),
    modified_timestamp: formatDateTime(faker.date.recent({ days: 7 })),
  };

  // Add diagnoses
  if (faker.datatype.boolean({ probability: 0.8 })) {
    const numDiagnoses = faker.number.int({ min: 1, max: 4 });
    encounter.diagnoses = Array.from({ length: numDiagnoses }, (_, i) => {
      const diagnosis = generateDiagnosis();
      return {
        diagnosis_id: generateUUID(),
        icd_code: diagnosis.code,
        icd_version: 'ICD-10' as const,
        description: diagnosis.display,
        diagnosis_type: i === 0 ? 'Primary' as const : 'Secondary' as const,
        sequence_number: i + 1,
        onset_date: faker.datatype.boolean({ probability: 0.5 }) ? formatDate(faker.date.past({ years: 2 })) : undefined,
      };
    });
  }

  // Add procedures for some encounters
  if (isClosed && faker.datatype.boolean({ probability: 0.6 })) {
    encounter.procedures = [{
      procedure_id: generateUUID(),
      cpt_code: faker.helpers.arrayElement(['99213', '99214', '99215', '99203', '99204', '99395']),
      description: 'Office/outpatient visit',
      quantity: 1,
      diagnosis_pointers: [1],
      service_date: formatDate(encounterDate),
      units: 1,
    }];
  }

  // Add vitals
  if (faker.datatype.boolean({ probability: 0.7 })) {
    encounter.vitals = {
      vitals_id: generateUUID(),
      encounter_id: encounter.encounter_id,
      recorded_date: formatDateTime(encounterDate),
      height_inches: faker.number.int({ min: 60, max: 76 }),
      weight_lbs: faker.number.float({ min: 100, max: 250, fractionDigits: 1 }),
      blood_pressure_systolic: faker.number.int({ min: 90, max: 160 }),
      blood_pressure_diastolic: faker.number.int({ min: 60, max: 100 }),
      pulse_rate: faker.number.int({ min: 60, max: 100 }),
      respiratory_rate: faker.number.int({ min: 12, max: 20 }),
      temperature_fahrenheit: faker.number.float({ min: 97.0, max: 99.5, fractionDigits: 1 }),
      oxygen_saturation: faker.number.int({ min: 95, max: 100 }),
    };
  }

  if (isClosed) {
    encounter.signed_by = provider.id;
    encounter.signed_date = formatDateTime(encounterDate);
  }

  return encounter;
}

/**
 * Generate a NextGen Problem
 */
export function generateNextGenProblem(personId?: string): NextGenProblem {
  const diagnosis = generateDiagnosis();
  const status = faker.helpers.arrayElement(['Active', 'Inactive', 'Resolved', 'Chronic'] as const);
  const onsetDate = faker.date.past({ years: 5 });

  return {
    problem_id: generateUUID(),
    person_id: personId || generateUUID(),
    practice_id: faker.string.alphanumeric(6).toUpperCase(),
    icd_code: diagnosis.code,
    icd_version: 'ICD-10',
    snomed_code: faker.string.numeric(9),
    description: diagnosis.display,
    status,
    priority: faker.helpers.arrayElement(['High', 'Medium', 'Low']),
    onset_date: formatDate(onsetDate),
    resolution_date: status === 'Resolved' ? formatDate(faker.date.recent({ days: 90 })) : undefined,
    diagnosed_by: faker.person.fullName(),
    last_reviewed_date: formatDate(faker.date.recent({ days: 180 })),
    notes: faker.datatype.boolean({ probability: 0.3 }) ? faker.lorem.sentence() : undefined,
    created_timestamp: formatDateTime(onsetDate),
    modified_timestamp: formatDateTime(faker.date.recent({ days: 30 })),
  };
}

/**
 * Generate a NextGen Allergy
 */
export function generateNextGenAllergy(personId?: string): NextGenAllergy {
  const allergy = generateAllergy();
  const recordedDate = faker.date.past({ years: 3 });

  return {
    allergy_id: generateUUID(),
    person_id: personId || generateUUID(),
    practice_id: faker.string.alphanumeric(6).toUpperCase(),
    allergen_name: allergy.display,
    allergen_code: allergy.code,
    allergen_code_system: 'SNOMED',
    allergen_type: faker.helpers.arrayElement(['Drug', 'Food', 'Environment', 'Latex', 'Other']),
    reaction_description: allergy.reaction,
    reaction_severity: faker.helpers.arrayElement(['Mild', 'Moderate', 'Severe', 'Fatal']),
    status: faker.helpers.arrayElement(['Active', 'Inactive']),
    onset_date: faker.datatype.boolean({ probability: 0.6 }) ? formatDate(faker.date.past({ years: 10 })) : undefined,
    recorded_date: formatDate(recordedDate),
    recorded_by: faker.person.fullName(),
    verified: faker.datatype.boolean({ probability: 0.8 }),
    notes: faker.datatype.boolean({ probability: 0.2 }) ? faker.lorem.sentence() : undefined,
    created_timestamp: formatDateTime(recordedDate),
    modified_timestamp: formatDateTime(faker.date.recent({ days: 60 })),
  };
}

/**
 * Generate a NextGen Medication
 */
export function generateNextGenMedication(personId?: string): NextGenMedication {
  const medication = generateMedication();
  const prescriptionDate = faker.date.past({ years: 1 });
  const status = faker.helpers.arrayElement(['Active', 'Discontinued', 'Completed', 'On Hold'] as const);
  const provider = generateProvider();

  return {
    medication_id: generateUUID(),
    person_id: personId || generateUUID(),
    practice_id: faker.string.alphanumeric(6).toUpperCase(),
    drug_name: medication.display,
    drug_code: medication.rxnorm,
    drug_code_system: 'RxNorm',
    dosage: medication.dosage,
    dosage_form: faker.helpers.arrayElement(['Tablet', 'Capsule', 'Solution', 'Suspension', 'Injection']),
    route: faker.helpers.arrayElement(['Oral', 'Subcutaneous', 'Intramuscular', 'Intravenous', 'Topical']),
    frequency: medication.frequency,
    quantity_prescribed: faker.number.int({ min: 30, max: 90 }),
    quantity_unit: 'tablets',
    refills_authorized: faker.number.int({ min: 0, max: 5 }),
    refills_remaining: faker.number.int({ min: 0, max: 5 }),
    days_supply: faker.number.int({ min: 30, max: 90 }),
    prescription_date: formatDate(prescriptionDate),
    start_date: formatDate(prescriptionDate),
    end_date: status !== 'Active' ? formatDate(faker.date.recent({ days: 30 })) : undefined,
    prescribing_provider_id: provider.id,
    pharmacy_name: faker.datatype.boolean({ probability: 0.7 }) ? faker.helpers.arrayElement([
      'CVS Pharmacy',
      'Walgreens',
      'Rite Aid',
      'Walmart Pharmacy',
      'Costco Pharmacy',
    ]) : undefined,
    status,
    discontinue_reason: status === 'Discontinued' ? faker.helpers.arrayElement([
      'Adverse reaction',
      'Ineffective',
      'Patient request',
      'Therapy complete',
      'Changed to alternative',
    ]) : undefined,
    sig: `Take ${medication.dosage} ${medication.frequency}`,
    is_controlled_substance: faker.datatype.boolean({ probability: 0.1 }),
    created_timestamp: formatDateTime(prescriptionDate),
    modified_timestamp: formatDateTime(faker.date.recent({ days: 30 })),
  };
}

/**
 * Generate a NextGen Lab Order
 */
export function generateNextGenLabOrder(personId?: string): NextGenLabOrder {
  const orderDate = faker.date.recent({ days: 14 });
  const hasResults = faker.datatype.boolean({ probability: 0.7 });
  const labTests = Array.from({ length: faker.number.int({ min: 3, max: 10 }) }, () => generateLabTest());
  const provider = generateProvider();

  const labOrder: NextGenLabOrder = {
    order_id: generateUUID(),
    person_id: personId || generateUUID(),
    practice_id: faker.string.alphanumeric(6).toUpperCase(),
    ordering_provider_id: provider.id,
    order_date: formatDate(orderDate),
    order_status: hasResults ? 'Completed' : faker.helpers.arrayElement(['Ordered', 'Collected', 'In Process']),
    priority: faker.helpers.arrayElement(['Routine', 'Urgent', 'STAT', 'ASAP']),
    performing_lab_name: faker.helpers.arrayElement([
      'Quest Diagnostics',
      'LabCorp',
      'ARUP Laboratories',
      'Mayo Clinic Laboratories',
    ]),
    performing_lab_id: faker.string.alphanumeric(6).toUpperCase(),
    order_tests: labTests.map(t => ({
      test_id: generateUUID(),
      test_code: t.code,
      test_name: t.display,
      loinc_code: t.code,
      cpt_code: faker.string.numeric(5),
    })),
    fasting_required: faker.datatype.boolean({ probability: 0.3 }),
    special_instructions: faker.datatype.boolean({ probability: 0.2 }) ? faker.lorem.sentence() : undefined,
    created_timestamp: formatDateTime(orderDate),
    modified_timestamp: formatDateTime(faker.date.recent({ days: 7 })),
  };

  if (hasResults) {
    labOrder.specimen_collection_date = formatDate(new Date(orderDate.getTime() + 24 * 60 * 60 * 1000));
    labOrder.result_date = formatDate(new Date(orderDate.getTime() + 3 * 24 * 60 * 60 * 1000));
    labOrder.results = labTests.map(t => ({
      result_id: generateUUID(),
      test_code: t.code,
      test_name: t.display,
      result_value: t.value.toString(),
      result_unit: t.unit,
      reference_range_low: t.low.toString(),
      reference_range_high: t.high.toString(),
      reference_range_text: `${t.low}-${t.high}`,
      abnormal_flag: t.isAbnormal ? (t.interpretation as 'L' | 'H') : 'N',
      result_status: 'Final',
      loinc_code: t.code,
      performed_date: formatDate(new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000)),
    }));
  }

  return labOrder;
}

/**
 * Generate a complete NextGen patient with all related data
 */
export function generateCompleteNextGenPatient(): {
  patient: NextGenPatient;
  appointments: NextGenAppointment[];
  encounters: NextGenEncounter[];
  problems: NextGenProblem[];
  allergies: NextGenAllergy[];
  medications: NextGenMedication[];
  labOrders: NextGenLabOrder[];
} {
  const patient = generateNextGenPatient();
  const personId = patient.person_id;

  return {
    patient,
    appointments: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => generateNextGenAppointment(personId)),
    encounters: Array.from({ length: faker.number.int({ min: 1, max: 4 }) }, () => generateNextGenEncounter(personId)),
    problems: Array.from({ length: faker.number.int({ min: 0, max: 4 }) }, () => generateNextGenProblem(personId)),
    allergies: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => generateNextGenAllergy(personId)),
    medications: Array.from({ length: faker.number.int({ min: 0, max: 6 }) }, () => generateNextGenMedication(personId)),
    labOrders: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => generateNextGenLabOrder(personId)),
  };
}

/**
 * Generate multiple NextGen patients
 */
export function generateNextGenPatients(count: number = 10): NextGenPatient[] {
  return Array.from({ length: count }, () => generateNextGenPatient());
}
