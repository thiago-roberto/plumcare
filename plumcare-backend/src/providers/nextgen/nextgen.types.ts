// NextGen-specific API response types
// These mirror the NextGen API structure for realistic mocking

export interface NextGenPatientResponse {
  personId: string;
  enterpriseId?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  birthDate: string; // YYYY-MM-DD
  gender: 'M' | 'F' | 'U';
  emailAddress?: string;
  homePhone?: string;
  mobilePhone?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  mrn?: string;
  practiceId: string;
  primaryProviderId?: string;
  createdDate: string;
  modifiedDate: string;
}

export interface NextGenEncounterResponse {
  encounterId: string;
  personId: string;
  encounterType: string;
  encounterDate: string;
  encounterTime?: string;
  status: 'Scheduled' | 'CheckedIn' | 'Roomed' | 'ReadyForProvider' | 'InProgress' | 'Completed' | 'Cancelled';
  providerId?: string;
  providerName?: string;
  practiceId: string;
  locationId?: string;
  locationName?: string;
  chiefComplaint?: string;
  notes?: string;
  createdDate: string;
  modifiedDate: string;
}

export interface NextGenVitalResponse {
  vitalId: string;
  personId: string;
  encounterId?: string;
  vitalDate: string;
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  pulse?: number;
  respiratoryRate?: number;
  temperature?: number;
  temperatureUnit?: 'F' | 'C';
  weight?: number;
  weightUnit?: 'lb' | 'kg';
  height?: number;
  heightUnit?: 'in' | 'cm';
  oxygenSaturation?: number;
  painLevel?: number;
  createdDate: string;
}

export interface NextGenProblemResponse {
  problemId: string;
  personId: string;
  problemDescription: string;
  icd10Code?: string;
  snomedCode?: string;
  status: 'Active' | 'Resolved' | 'Inactive';
  onsetDate?: string;
  resolvedDate?: string;
  chronicIndicator?: boolean;
  createdDate: string;
  modifiedDate: string;
}

export interface NextGenLabResultResponse {
  labResultId: string;
  personId: string;
  orderId?: string;
  testName: string;
  results: Array<{
    componentName: string;
    value: string;
    unit?: string;
    referenceRange?: string;
    abnormalFlag?: 'H' | 'L' | 'N' | 'A';
  }>;
  status: 'Preliminary' | 'Final' | 'Corrected' | 'Cancelled';
  collectionDate?: string;
  resultDate: string;
  orderingProviderId?: string;
  createdDate: string;
}
