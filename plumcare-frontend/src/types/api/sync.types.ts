// Sync API Types
export interface MockDataSyncRequest {
  patientCount?: number;
  includeAllData?: boolean;
}

export interface EhrResourceSummary {
  patients: number;
  encounters: number;
  observations: number;
  conditions: number;
  allergies: number;
  medications: number;
  diagnosticReports: number;
}

export interface MockDataSyncResponse {
  success: boolean;
  summary: {
    athena: EhrResourceSummary;
    elation: EhrResourceSummary;
    nextgen: EhrResourceSummary;
  };
  totalResources: number;
  errors?: string[];
}
