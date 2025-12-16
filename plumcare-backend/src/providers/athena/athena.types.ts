// Athena-specific API response types
// These mirror the Athena API structure for realistic mocking

export interface AthenaPatientResponse {
  patientid: string;
  firstname: string;
  lastname: string;
  middlename?: string;
  dob: string; // YYYY-MM-DD
  sex: 'M' | 'F' | 'O';
  email?: string;
  homephone?: string;
  mobilephone?: string;
  address1?: string;
  city?: string;
  state?: string;
  zip?: string;
  enterpriseid?: string;
  departmentid?: string;
  primaryproviderid?: string;
  lastupdated: string;
}

export interface AthenaEncounterResponse {
  encounterid: string;
  patientid: string;
  encountertype: string;
  encounterdate: string; // MM/DD/YYYY
  encountertime?: string;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  providername?: string;
  providerid?: string;
  departmentid?: string;
  appointmentid?: string;
  notes?: string;
  lastupdated: string;
}

export interface AthenaVitalResponse {
  clinicalelementid: string;
  patientid: string;
  clinicalelementname: string;
  value: string;
  unit?: string;
  recordeddate: string;
  recordedby?: string;
}

export interface AthenaProblemResponse {
  problemid: string;
  patientid: string;
  snomedcode?: string;
  icd10codes?: string[];
  problemname: string;
  status: 'ACTIVE' | 'RESOLVED' | 'CHRONIC';
  onsetdate?: string;
  lastupdated: string;
}

export interface AthenaLabResultResponse {
  labresultid: string;
  patientid: string;
  orderid?: string;
  labname: string;
  results?: Array<{
    analyte: string;
    value: string;
    unit?: string;
    referencerange?: string;
    abnormalflag?: 'H' | 'L' | 'N';
  }>;
  status: 'FINAL' | 'PRELIMINARY' | 'PENDING';
  resultdate: string;
  providerid?: string;
}

export interface AthenaPaginatedResponse<T> {
  totalcount: number;
  patients?: T[];
  encounters?: T[];
  vitals?: T[];
  problems?: T[];
  labresults?: T[];
  next?: string;
}
