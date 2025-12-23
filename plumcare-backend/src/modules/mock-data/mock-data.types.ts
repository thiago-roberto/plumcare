/**
 * Mock data request parameters
 */
export interface MockDataRequest {
  patientCount?: number;
  includeAllData?: boolean;
}

/**
 * EHR summary counts
 */
export interface EhrSummary {
  patients: number;
  encounters: number;
  observations: number;
  conditions: number;
  allergies: number;
  medications: number;
  diagnosticReports: number;
}

/**
 * Mock data sync response
 */
export interface MockDataSyncResponse {
  success: boolean;
  summary: {
    athena: EhrSummary;
    elation: EhrSummary;
    nextgen: EhrSummary;
  };
  totalResources: number;
  errors?: string[];
}
