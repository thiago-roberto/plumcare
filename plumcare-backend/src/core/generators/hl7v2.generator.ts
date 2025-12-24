import {
  faker,
  generatePatientData,
  generateEncounterData,
  generateLabTest,
  generateDiagnosis,
  generateProvider,
  generateMessageControlId,
  generateOrderNumber,
  generateFillerOrderNumber,
  formatHL7Date,
  formatHL7DateTime,
  PatientData,
  EncounterData,
} from './utils.js';

// HL7v2 segment separator
const SEGMENT_SEPARATOR = '\r';
const FIELD_SEPARATOR = '|';
const COMPONENT_SEPARATOR = '^';
const REPETITION_SEPARATOR = '~';
const ESCAPE_CHARACTER = '\\';
const SUBCOMPONENT_SEPARATOR = '&';

export interface HL7v2Message {
  messageType: string;
  triggerEvent: string;
  raw: string;
  segments: string[];
  parsed: {
    messageControlId: string;
    patientId: string;
    patientData?: PatientData;
    encounterData?: EncounterData;
    timestamp: Date;
  };
}

function buildMSH(messageType: string, triggerEvent: string, sendingApp: string, sendingFacility: string): string {
  const timestamp = formatHL7DateTime(new Date());
  const messageControlId = generateMessageControlId();

  return [
    'MSH',
    `${COMPONENT_SEPARATOR}${REPETITION_SEPARATOR}${ESCAPE_CHARACTER}${SUBCOMPONENT_SEPARATOR}`,
    sendingApp,
    sendingFacility,
    'PLUMCARE',
    'PLUMCARE_FACILITY',
    timestamp,
    '', // Security
    `${messageType}${COMPONENT_SEPARATOR}${triggerEvent}`,
    messageControlId,
    'P', // Processing ID (Production)
    '2.5.1', // HL7 Version
  ].join(FIELD_SEPARATOR);
}

function buildEVN(triggerEvent: string, timestamp: Date): string {
  return [
    'EVN',
    triggerEvent,
    formatHL7DateTime(timestamp),
    '', // Date/Time Planned Event
    '', // Event Reason Code
    '', // Operator ID
    formatHL7DateTime(timestamp), // Event Occurred
  ].join(FIELD_SEPARATOR);
}

function buildPID(patient: PatientData, setId: number = 1): string {
  const address = patient.address;

  return [
    'PID',
    setId.toString(),
    '', // Patient ID (External)
    `${patient.mrn}^^^${patient.mrn.substring(0, 3)}&2.16.840.1.113883.4.3&ISO^MR`, // Patient ID List
    '', // Alternate Patient ID
    `${patient.lastName}${COMPONENT_SEPARATOR}${patient.firstName}${patient.middleName ? COMPONENT_SEPARATOR + patient.middleName : ''}`, // Patient Name
    '', // Mother's Maiden Name
    formatHL7Date(patient.dob),
    patient.gender === 'male' ? 'M' : patient.gender === 'female' ? 'F' : patient.gender === 'other' ? 'O' : 'U',
    '', // Patient Alias
    `${patient.race}${COMPONENT_SEPARATOR}${getRaceDescription(patient.race)}${COMPONENT_SEPARATOR}HL70005`, // Race
    `${address.street}${COMPONENT_SEPARATOR}${COMPONENT_SEPARATOR}${address.city}${COMPONENT_SEPARATOR}${address.state}${COMPONENT_SEPARATOR}${address.postalCode}${COMPONENT_SEPARATOR}${address.country}`, // Address
    '', // County Code
    `${patient.phone.replace(/\D/g, '')}${COMPONENT_SEPARATOR}PRN${COMPONENT_SEPARATOR}PH`, // Home Phone
    '', // Business Phone
    patient.language,
    getMaritalStatusDescription(patient.maritalStatus),
    '', // Religion
    patient.id, // Patient Account Number
    patient.ssn.replace(/-/g, ''), // SSN
    '', // Driver's License
    '', // Mother's Identifier
    `${patient.ethnicity}${COMPONENT_SEPARATOR}${getEthnicityDescription(patient.ethnicity)}${COMPONENT_SEPARATOR}HL70189`, // Ethnic Group
    '', // Birth Place
    '', // Multiple Birth Indicator
    '', // Birth Order
    '', // Citizenship
    '', // Veterans Military Status
    '', // Nationality
    '', // Patient Death Date
    '', // Patient Death Indicator
  ].join(FIELD_SEPARATOR);
}

function buildPV1(encounter: EncounterData, setId: number = 1): string {
  const provider = encounter.provider;
  const facility = encounter.facility;

  return [
    'PV1',
    setId.toString(),
    getPatientClass(encounter.typeCode),
    `${facility.name}${COMPONENT_SEPARATOR}${COMPONENT_SEPARATOR}${COMPONENT_SEPARATOR}${facility.id}`, // Assigned Patient Location
    '', // Admission Type
    '', // Preadmit Number
    '', // Prior Patient Location
    `${provider.id}${COMPONENT_SEPARATOR}${provider.lastName}${COMPONENT_SEPARATOR}${provider.firstName}${COMPONENT_SEPARATOR}${COMPONENT_SEPARATOR}${COMPONENT_SEPARATOR}${COMPONENT_SEPARATOR}${COMPONENT_SEPARATOR}${COMPONENT_SEPARATOR}${provider.npi}`, // Attending Doctor
    '', // Referring Doctor
    '', // Consulting Doctor
    '', // Hospital Service
    '', // Temporary Location
    '', // Preadmit Test Indicator
    '', // Re-admission Indicator
    '', // Admit Source
    '', // Ambulatory Status
    '', // VIP Indicator
    '', // Admitting Doctor
    '', // Patient Type
    encounter.visitNumber, // Visit Number
    '', // Financial Class
    '', // Charge Price Indicator
    '', // Courtesy Code
    '', // Credit Rating
    '', // Contract Code
    '', // Contract Effective Date
    '', // Contract Amount
    '', // Contract Period
    '', // Interest Code
    '', // Transfer to Bad Debt Code
    '', // Transfer to Bad Debt Date
    '', // Bad Debt Agency Code
    '', // Bad Debt Transfer Amount
    '', // Bad Debt Recovery Amount
    '', // Delete Account Indicator
    '', // Delete Account Date
    '', // Discharge Disposition
    '', // Discharged to Location
    '', // Diet Type
    '', // Servicing Facility
    '', // Bed Status
    '', // Account Status
    '', // Pending Location
    '', // Prior Temporary Location
    formatHL7DateTime(encounter.startTime), // Admit Date/Time
    encounter.endTime ? formatHL7DateTime(encounter.endTime) : '', // Discharge Date/Time
    '', // Current Patient Balance
    '', // Total Charges
    '', // Total Adjustments
    '', // Total Payments
    '', // Alternate Visit ID
    getVisitIndicator(encounter.status), // Visit Indicator
  ].join(FIELD_SEPARATOR);
}

function buildDG1(diagnosis: ReturnType<typeof generateDiagnosis>, setId: number = 1): string {
  return [
    'DG1',
    setId.toString(),
    'ICD10', // Diagnosis Coding Method
    `${diagnosis.code}${COMPONENT_SEPARATOR}${diagnosis.display}${COMPONENT_SEPARATOR}ICD10`, // Diagnosis Code
    diagnosis.display,
    formatHL7DateTime(new Date()), // Diagnosis Date/Time
    'A', // Diagnosis Type (Admitting)
    '', // Major Diagnostic Category
    '', // Diagnostic Related Group
    '', // DRG Approval Indicator
    '', // DRG Grouper Review Code
    '', // Outlier Type
    '', // Outlier Days
    '', // Outlier Cost
    '', // Grouper Version and Type
    setId.toString(), // Diagnosis Priority
  ].join(FIELD_SEPARATOR);
}

function buildORC(orderNumber: string, fillerNumber: string, status: string = 'CM'): string {
  const provider = generateProvider();

  return [
    'ORC',
    'RE', // Order Control (Results)
    orderNumber, // Placer Order Number
    fillerNumber, // Filler Order Number
    '', // Placer Group Number
    status, // Order Status (CM = Completed)
    '', // Response Flag
    '', // Quantity/Timing
    '', // Parent
    formatHL7DateTime(new Date()), // Date/Time of Transaction
    '', // Entered By
    '', // Verified By
    `${provider.id}${COMPONENT_SEPARATOR}${provider.lastName}${COMPONENT_SEPARATOR}${provider.firstName}`, // Ordering Provider
    '', // Enterer's Location
    '', // Call Back Phone Number
    formatHL7DateTime(new Date()), // Order Effective Date/Time
  ].join(FIELD_SEPARATOR);
}

function buildOBR(orderNumber: string, fillerNumber: string, testCode: string, testName: string, setId: number = 1): string {
  const timestamp = formatHL7DateTime(new Date());

  return [
    'OBR',
    setId.toString(),
    orderNumber,
    fillerNumber,
    `${testCode}${COMPONENT_SEPARATOR}${testName}${COMPONENT_SEPARATOR}LN`, // Universal Service ID
    '', // Priority
    timestamp, // Requested Date/Time
    timestamp, // Observation Date/Time
    timestamp, // Observation End Date/Time
    '', // Collection Volume
    '', // Collector Identifier
    '', // Specimen Action Code
    '', // Danger Code
    '', // Relevant Clinical Info
    timestamp, // Specimen Received Date/Time
    '', // Specimen Source
    '', // Ordering Provider
    '', // Order Callback Phone Number
    '', // Placer Field 1
    '', // Placer Field 2
    '', // Filler Field 1
    '', // Filler Field 2
    timestamp, // Results Report/Status Change
    '', // Charge to Practice
    '', // Diagnostic Service Section ID
    'F', // Result Status (Final)
  ].join(FIELD_SEPARATOR);
}

function buildOBX(
  labResult: ReturnType<typeof generateLabTest>,
  setId: number = 1,
  observationSubId: string = '1'
): string {
  return [
    'OBX',
    setId.toString(),
    'NM', // Value Type (Numeric)
    `${labResult.code}${COMPONENT_SEPARATOR}${labResult.display}${COMPONENT_SEPARATOR}LN`, // Observation Identifier
    observationSubId,
    labResult.value.toString(), // Observation Value
    labResult.unit, // Units
    `${labResult.low}-${labResult.high}`, // Reference Range
    labResult.interpretation, // Abnormal Flags (N=Normal, L=Low, H=High)
    '', // Probability
    '', // Nature of Abnormal Test
    'F', // Observation Result Status (Final)
    '', // Effective Date of Reference Range
    '', // User Defined Access Checks
    formatHL7DateTime(new Date()), // Date/Time of Observation
    '', // Producer's ID
    '', // Responsible Observer
    '', // Observation Method
  ].join(FIELD_SEPARATOR);
}

function buildNTE(comment: string, setId: number = 1): string {
  return [
    'NTE',
    setId.toString(),
    'L', // Source of Comment (Lab)
    comment,
  ].join(FIELD_SEPARATOR);
}

// Helper functions
function getRaceDescription(code: string): string {
  const races: Record<string, string> = {
    '2106-3': 'White',
    '2054-5': 'Black or African American',
    '2028-9': 'Asian',
    '2076-8': 'Native Hawaiian or Other Pacific Islander',
    '2131-1': 'Other Race',
  };
  return races[code] || 'Unknown';
}

function getEthnicityDescription(code: string): string {
  const ethnicities: Record<string, string> = {
    '2135-2': 'Hispanic or Latino',
    '2186-5': 'Not Hispanic or Latino',
  };
  return ethnicities[code] || 'Unknown';
}

function getMaritalStatusDescription(code: string): string {
  const statuses: Record<string, string> = {
    'S': 'S^Single^HL70002',
    'M': 'M^Married^HL70002',
    'D': 'D^Divorced^HL70002',
    'W': 'W^Widowed^HL70002',
  };
  return statuses[code] || 'U^Unknown^HL70002';
}

function getPatientClass(typeCode: string): string {
  const classes: Record<string, string> = {
    'AMB': 'O', // Outpatient
    'EMER': 'E', // Emergency
    'IMP': 'I', // Inpatient
    'VR': 'O', // Virtual (treated as Outpatient)
  };
  return classes[typeCode] || 'O';
}

function getVisitIndicator(status: string): string {
  return status === 'finished' ? 'V' : 'A'; // V=Visit, A=Account
}

/**
 * Generate ADT^A01 (Admit) message
 */
export function generateADT_A01(ehrPrefix: string = 'ATH-'): HL7v2Message {
  const patient = generatePatientData(ehrPrefix);
  const encounter = generateEncounterData(patient.id);
  const timestamp = new Date();

  const segments = [
    buildMSH('ADT', 'A01', 'ATHENA_EHR', 'ATHENA_FACILITY'),
    buildEVN('A01', timestamp),
    buildPID(patient),
    buildPV1(encounter),
  ];

  // Add diagnosis if present
  if (encounter.diagnosis) {
    segments.push(buildDG1(encounter.diagnosis));
  }

  return {
    messageType: 'ADT',
    triggerEvent: 'A01',
    raw: segments.join(SEGMENT_SEPARATOR),
    segments,
    parsed: {
      messageControlId: segments[0].split(FIELD_SEPARATOR)[9],
      patientId: patient.id,
      patientData: patient,
      encounterData: encounter,
      timestamp,
    },
  };
}

/**
 * Generate ADT^A08 (Update Patient Information) message
 */
export function generateADT_A08(ehrPrefix: string = 'ATH-'): HL7v2Message {
  const patient = generatePatientData(ehrPrefix);
  const encounter = generateEncounterData(patient.id);
  const timestamp = new Date();

  const segments = [
    buildMSH('ADT', 'A08', 'ATHENA_EHR', 'ATHENA_FACILITY'),
    buildEVN('A08', timestamp),
    buildPID(patient),
    buildPV1(encounter),
  ];

  return {
    messageType: 'ADT',
    triggerEvent: 'A08',
    raw: segments.join(SEGMENT_SEPARATOR),
    segments,
    parsed: {
      messageControlId: segments[0].split(FIELD_SEPARATOR)[9],
      patientId: patient.id,
      patientData: patient,
      encounterData: encounter,
      timestamp,
    },
  };
}

/**
 * Generate ORU^R01 (Lab Results) message
 */
export function generateORU_R01(ehrPrefix: string = 'ATH-', numResults: number = 5): HL7v2Message {
  const patient = generatePatientData(ehrPrefix);
  const timestamp = new Date();
  const orderNumber = generateOrderNumber();
  const fillerNumber = generateFillerOrderNumber();

  const segments = [
    buildMSH('ORU', 'R01', 'LAB_SYSTEM', 'ATHENA_LAB'),
    buildPID(patient),
    buildORC(orderNumber, fillerNumber),
  ];

  // Generate lab results panel
  const labPanel = faker.helpers.arrayElement([
    { code: '24323-8', name: 'Comprehensive metabolic panel' },
    { code: '57021-8', name: 'CBC with Differential' },
    { code: '24362-6', name: 'Lipid Panel' },
    { code: '55399-0', name: 'Basic metabolic panel' },
  ]);

  segments.push(buildOBR(orderNumber, fillerNumber, labPanel.code, labPanel.name));

  // Add individual test results
  for (let i = 0; i < numResults; i++) {
    const labResult = generateLabTest();
    segments.push(buildOBX(labResult, i + 1));

    // Add comment for abnormal results
    if (labResult.isAbnormal) {
      segments.push(buildNTE(
        `Result ${labResult.interpretation === 'H' ? 'above' : 'below'} normal range. Please review.`,
        i + 1
      ));
    }
  }

  return {
    messageType: 'ORU',
    triggerEvent: 'R01',
    raw: segments.join(SEGMENT_SEPARATOR),
    segments,
    parsed: {
      messageControlId: segments[0].split(FIELD_SEPARATOR)[9],
      patientId: patient.id,
      patientData: patient,
      timestamp,
    },
  };
}

/**
 * Generate multiple HL7v2 messages of random types
 */
export function generateHL7v2Messages(count: number = 10, ehrPrefix: string = 'ATH-'): HL7v2Message[] {
  const messages: HL7v2Message[] = [];

  for (let i = 0; i < count; i++) {
    const messageType = faker.helpers.arrayElement(['ADT_A01', 'ADT_A08', 'ORU_R01']);

    switch (messageType) {
      case 'ADT_A01':
        messages.push(generateADT_A01(ehrPrefix));
        break;
      case 'ADT_A08':
        messages.push(generateADT_A08(ehrPrefix));
        break;
      case 'ORU_R01':
        messages.push(generateORU_R01(ehrPrefix, faker.number.int({ min: 3, max: 10 })));
        break;
    }
  }

  return messages;
}
