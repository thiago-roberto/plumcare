import { faker } from '@faker-js/faker';
import { v4 as uuidv4 } from 'uuid';

// Healthcare-specific data that Faker doesn't provide
const PROVIDERS = [
  { id: 'P001', firstName: 'Robert', lastName: 'Williams', npi: '1234567890', specialty: 'Internal Medicine' },
  { id: 'P002', firstName: 'Sarah', lastName: 'Johnson', npi: '2345678901', specialty: 'Family Medicine' },
  { id: 'P003', firstName: 'Michael', lastName: 'Chen', npi: '3456789012', specialty: 'Cardiology' },
  { id: 'P004', firstName: 'Jennifer', lastName: 'Davis', npi: '4567890123', specialty: 'Pediatrics' },
  { id: 'P005', firstName: 'David', lastName: 'Martinez', npi: '5678901234', specialty: 'Orthopedics' },
  { id: 'P006', firstName: 'Emily', lastName: 'Thompson', npi: '6789012345', specialty: 'Neurology' },
  { id: 'P007', firstName: 'James', lastName: 'Garcia', npi: '7890123456', specialty: 'Emergency Medicine' },
  { id: 'P008', firstName: 'Lisa', lastName: 'Anderson', npi: '8901234567', specialty: 'Dermatology' },
];

const FACILITIES = [
  { id: 'F001', name: 'Memorial General Hospital', npi: '1111111111' },
  { id: 'F002', name: 'St. Mary Medical Center', npi: '2222222222' },
  { id: 'F003', name: 'University Health System', npi: '3333333333' },
  { id: 'F004', name: 'Community Health Clinic', npi: '4444444444' },
  { id: 'F005', name: 'Regional Medical Center', npi: '5555555555' },
  { id: 'F006', name: 'Downtown Family Practice', npi: '6666666666' },
];

const DIAGNOSES = [
  { code: 'I10', display: 'Essential (primary) hypertension', system: 'ICD-10' },
  { code: 'E11.9', display: 'Type 2 diabetes mellitus without complications', system: 'ICD-10' },
  { code: 'J06.9', display: 'Acute upper respiratory infection, unspecified', system: 'ICD-10' },
  { code: 'M54.5', display: 'Low back pain', system: 'ICD-10' },
  { code: 'R10.9', display: 'Unspecified abdominal pain', system: 'ICD-10' },
  { code: 'K21.0', display: 'Gastro-esophageal reflux disease with esophagitis', system: 'ICD-10' },
  { code: 'F32.9', display: 'Major depressive disorder, single episode, unspecified', system: 'ICD-10' },
  { code: 'J45.909', display: 'Unspecified asthma, uncomplicated', system: 'ICD-10' },
  { code: 'N39.0', display: 'Urinary tract infection, site not specified', system: 'ICD-10' },
  { code: 'G43.909', display: 'Migraine, unspecified, not intractable', system: 'ICD-10' },
];

const LAB_TESTS = [
  { code: '2345-7', display: 'Glucose [Mass/volume] in Serum or Plasma', unit: 'mg/dL', low: 70, high: 100 },
  { code: '2093-3', display: 'Cholesterol [Mass/volume] in Serum or Plasma', unit: 'mg/dL', low: 125, high: 200 },
  { code: '718-7', display: 'Hemoglobin [Mass/volume] in Blood', unit: 'g/dL', low: 12, high: 17 },
  { code: '4544-3', display: 'Hematocrit [Volume Fraction] of Blood', unit: '%', low: 36, high: 50 },
  { code: '6690-2', display: 'Leukocytes [#/volume] in Blood', unit: '10*3/uL', low: 4.5, high: 11.0 },
  { code: '777-3', display: 'Platelets [#/volume] in Blood', unit: '10*3/uL', low: 150, high: 400 },
  { code: '2160-0', display: 'Creatinine [Mass/volume] in Serum or Plasma', unit: 'mg/dL', low: 0.7, high: 1.3 },
  { code: '3094-0', display: 'Blood urea nitrogen', unit: 'mg/dL', low: 7, high: 20 },
  { code: '2951-2', display: 'Sodium [Moles/volume] in Serum or Plasma', unit: 'mmol/L', low: 136, high: 145 },
  { code: '2823-3', display: 'Potassium [Moles/volume] in Serum or Plasma', unit: 'mmol/L', low: 3.5, high: 5.0 },
];

const VITAL_SIGNS = [
  { code: '8867-4', display: 'Heart rate', unit: '/min', low: 60, high: 100 },
  { code: '8480-6', display: 'Systolic blood pressure', unit: 'mmHg', low: 90, high: 140 },
  { code: '8462-4', display: 'Diastolic blood pressure', unit: 'mmHg', low: 60, high: 90 },
  { code: '8310-5', display: 'Body temperature', unit: 'degF', low: 97.0, high: 99.5 },
  { code: '9279-1', display: 'Respiratory rate', unit: '/min', low: 12, high: 20 },
  { code: '2708-6', display: 'Oxygen saturation', unit: '%', low: 95, high: 100 },
  { code: '29463-7', display: 'Body weight', unit: 'kg', low: 50, high: 120 },
  { code: '8302-2', display: 'Body height', unit: 'cm', low: 150, high: 200 },
];

const ALLERGIES = [
  { code: '91936005', display: 'Penicillin allergy', reaction: 'Hives, rash' },
  { code: '91935009', display: 'Allergy to sulfonamide', reaction: 'Anaphylaxis' },
  { code: '294505008', display: 'Allergy to aspirin', reaction: 'Bronchospasm' },
  { code: '418634005', display: 'Allergic reaction to peanut', reaction: 'Anaphylaxis' },
  { code: '418689008', display: 'Allergy to shellfish', reaction: 'Hives, swelling' },
  { code: '300913006', display: 'Latex allergy', reaction: 'Contact dermatitis' },
  { code: '419474003', display: 'Allergy to mold', reaction: 'Sneezing, congestion' },
  { code: '232347008', display: 'Allergy to egg', reaction: 'Gastrointestinal upset' },
];

const MEDICATIONS = [
  { code: '314076', rxnorm: '314076', display: 'Lisinopril 10 MG Oral Tablet', dosage: '10mg', frequency: 'once daily' },
  { code: '860975', rxnorm: '860975', display: 'Metformin 500 MG Oral Tablet', dosage: '500mg', frequency: 'twice daily' },
  { code: '197361', rxnorm: '197361', display: 'Atorvastatin 20 MG Oral Tablet', dosage: '20mg', frequency: 'once daily' },
  { code: '311989', rxnorm: '311989', display: 'Omeprazole 20 MG Delayed Release Oral Capsule', dosage: '20mg', frequency: 'once daily' },
  { code: '310798', rxnorm: '310798', display: 'Levothyroxine 50 MCG Oral Tablet', dosage: '50mcg', frequency: 'once daily' },
  { code: '197380', rxnorm: '197380', display: 'Amlodipine 5 MG Oral Tablet', dosage: '5mg', frequency: 'once daily' },
  { code: '313782', rxnorm: '313782', display: 'Acetaminophen 500 MG Oral Tablet', dosage: '500mg', frequency: 'as needed' },
  { code: '197591', rxnorm: '197591', display: 'Ibuprofen 400 MG Oral Tablet', dosage: '400mg', frequency: 'every 6 hours as needed' },
];

const ENCOUNTER_REASONS = [
  'Annual wellness exam',
  'Follow-up visit',
  'New patient evaluation',
  'Medication review',
  'Blood pressure check',
  'Lab results review',
  'Acute illness',
  'Chronic disease management',
  'Preventive care visit',
  'Post-operative follow-up',
];

// Utility functions using Faker
export function generateUUID(): string {
  return uuidv4();
}

export function generateMRN(prefix: string): string {
  return `${prefix}${faker.string.numeric(6)}`;
}

export function generateSSN(): string {
  return `${faker.string.numeric(3)}-${faker.string.numeric(2)}-${faker.string.numeric(4)}`;
}

export function generatePhone(): string {
  return faker.phone.number({ style: 'national' });
}

export function generatePhoneRaw(): string {
  return faker.string.numeric(10);
}

export type Gender = 'male' | 'female' | 'other' | 'unknown';

export function generateGender(): Gender {
  const rand = Math.random();
  if (rand < 0.48) return 'male';
  if (rand < 0.96) return 'female';
  if (rand < 0.98) return 'other';
  return 'unknown';
}

export function generateFirstName(gender: Gender): string {
  if (gender === 'male') {
    return faker.person.firstName('male');
  } else if (gender === 'female') {
    return faker.person.firstName('female');
  }
  return faker.person.firstName();
}

export function generateLastName(): string {
  return faker.person.lastName();
}

export function generateMiddleName(gender: Gender): string {
  if (gender === 'male') {
    return faker.person.firstName('male');
  } else if (gender === 'female') {
    return faker.person.firstName('female');
  }
  return faker.person.firstName();
}

export function generateEmail(firstName: string, lastName: string): string {
  return faker.internet.email({ firstName, lastName }).toLowerCase();
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export function generateAddress(): Address {
  return {
    street: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    postalCode: faker.location.zipCode(),
    country: 'USA',
  };
}

export function generateDOB(minAge: number = 1, maxAge: number = 90): Date {
  return faker.date.birthdate({ min: minAge, max: maxAge, mode: 'age' });
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function formatDateTime(date: Date): string {
  return date.toISOString();
}

export function formatHL7Date(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

export function formatHL7DateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

export function generateRecentDate(daysBack: number = 30): Date {
  return faker.date.recent({ days: daysBack });
}

export function generatePastDate(years: number = 5): Date {
  return faker.date.past({ years });
}

export function generateProvider() {
  return faker.helpers.arrayElement(PROVIDERS);
}

export function generateFacility() {
  return faker.helpers.arrayElement(FACILITIES);
}

export function generateDiagnosis() {
  return faker.helpers.arrayElement(DIAGNOSES);
}

export function generateLabTest() {
  const test = faker.helpers.arrayElement(LAB_TESTS);
  const isAbnormal = faker.datatype.boolean({ probability: 0.2 });
  let value: number;
  if (isAbnormal) {
    value = faker.datatype.boolean()
      ? faker.number.float({ min: test.low * 0.7, max: test.low * 0.95, fractionDigits: 1 })
      : faker.number.float({ min: test.high * 1.05, max: test.high * 1.3, fractionDigits: 1 });
  } else {
    value = faker.number.float({ min: test.low, max: test.high, fractionDigits: 1 });
  }
  return {
    ...test,
    value,
    isAbnormal,
    interpretation: isAbnormal ? (value < test.low ? 'L' : 'H') : 'N',
  };
}

export function generateVitalSign() {
  const vital = faker.helpers.arrayElement(VITAL_SIGNS);
  const value = faker.number.float({ min: vital.low, max: vital.high, fractionDigits: 1 });
  return {
    ...vital,
    value,
  };
}

export function generateAllergy() {
  return faker.helpers.arrayElement(ALLERGIES);
}

export function generateMedication() {
  return faker.helpers.arrayElement(MEDICATIONS);
}

export function generateEncounterReason(): string {
  return faker.helpers.arrayElement(ENCOUNTER_REASONS);
}

export function generateMessageControlId(): string {
  return `MSG${Date.now()}${faker.string.numeric(4)}`;
}

export function generateAccountNumber(): string {
  return `ACCT${faker.string.numeric(8)}`;
}

export function generateVisitNumber(): string {
  return `V${faker.string.numeric(7)}`;
}

export function generateOrderNumber(): string {
  return `ORD${faker.string.numeric(6)}`;
}

export function generateFillerOrderNumber(): string {
  return `LAB${faker.string.numeric(6)}`;
}

export function generateNPI(): string {
  return faker.string.numeric(10);
}

export interface PatientData {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  gender: Gender;
  dob: Date;
  ssn: string;
  phone: string;
  email: string;
  address: Address;
  maritalStatus: 'S' | 'M' | 'D' | 'W';
  language: string;
  race: string;
  ethnicity: string;
}

export function generatePatientData(ehrPrefix: string): PatientData {
  const gender = generateGender();
  const firstName = generateFirstName(gender);
  const lastName = generateLastName();
  const hasMiddleName = faker.datatype.boolean({ probability: 0.7 });

  return {
    id: generateUUID(),
    mrn: generateMRN(ehrPrefix),
    firstName,
    lastName,
    middleName: hasMiddleName ? generateMiddleName(gender) : undefined,
    gender,
    dob: generateDOB(1, 85),
    ssn: generateSSN(),
    phone: generatePhone(),
    email: generateEmail(firstName, lastName),
    address: generateAddress(),
    maritalStatus: faker.helpers.arrayElement(['S', 'M', 'D', 'W'] as const),
    language: faker.helpers.arrayElement(['en', 'es', 'fr', 'zh', 'vi', 'ko', 'ar']),
    race: faker.helpers.arrayElement(['2106-3', '2054-5', '2028-9', '2076-8', '2131-1']),
    ethnicity: faker.helpers.arrayElement(['2135-2', '2186-5']),
  };
}

export interface EncounterData {
  id: string;
  visitNumber: string;
  accountNumber: string;
  patientId: string;
  type: string;
  typeCode: string;
  status: string;
  startTime: Date;
  endTime?: Date;
  provider: ReturnType<typeof generateProvider>;
  facility: ReturnType<typeof generateFacility>;
  diagnosis?: ReturnType<typeof generateDiagnosis>;
  reason: string;
}

export function generateEncounterData(patientId: string): EncounterData {
  const encounterTypes = [
    { type: 'Office Visit', code: 'AMB' },
    { type: 'Emergency Visit', code: 'EMER' },
    { type: 'Inpatient', code: 'IMP' },
    { type: 'Telehealth', code: 'VR' },
    { type: 'Lab Visit', code: 'AMB' },
    { type: 'Urgent Care', code: 'AMB' },
  ];

  const encounterType = faker.helpers.arrayElement(encounterTypes);
  const startTime = generateRecentDate(60);
  const hasEnded = faker.datatype.boolean({ probability: 0.8 });
  const hasDiagnosis = faker.datatype.boolean({ probability: 0.7 });

  return {
    id: generateUUID(),
    visitNumber: generateVisitNumber(),
    accountNumber: generateAccountNumber(),
    patientId,
    type: encounterType.type,
    typeCode: encounterType.code,
    status: hasEnded ? 'finished' : 'in-progress',
    startTime,
    endTime: hasEnded ? new Date(startTime.getTime() + faker.number.int({ min: 15, max: 120 }) * 60000) : undefined,
    provider: generateProvider(),
    facility: generateFacility(),
    diagnosis: hasDiagnosis ? generateDiagnosis() : undefined,
    reason: generateEncounterReason(),
  };
}

// Export healthcare data arrays for direct access
export const HEALTHCARE_DATA = {
  PROVIDERS,
  FACILITIES,
  DIAGNOSES,
  LAB_TESTS,
  VITAL_SIGNS,
  ALLERGIES,
  MEDICATIONS,
  ENCOUNTER_REASONS,
};

// Re-export faker for use in generators
export { faker };
