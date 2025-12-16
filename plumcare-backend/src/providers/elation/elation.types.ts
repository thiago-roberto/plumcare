// Elation-specific API response types
// These mirror the Elation API structure for realistic mocking

export interface ElationPatientResponse {
  id: number;
  first_name: string;
  last_name: string;
  middle_name?: string;
  dob: string; // YYYY-MM-DD
  sex: 'Male' | 'Female' | 'Other';
  email?: string;
  primary_phone?: string;
  address?: {
    address_line1?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  mrn?: string;
  practice: number;
  primary_physician?: number;
  created_date: string;
  last_modified: string;
}

export interface ElationAppointmentResponse {
  id: number;
  patient: number;
  scheduled_date: string;
  duration: number; // minutes
  status: 'Scheduled' | 'Confirmed' | 'Checked In' | 'In Progress' | 'Complete' | 'Cancelled' | 'No Show';
  reason?: string;
  physician?: number;
  practice: number;
  service_location?: number;
  notes?: string;
  created_date: string;
  last_modified: string;
}

export interface ElationVitalResponse {
  id: number;
  patient: number;
  created_date: string;
  height?: { value: number; unit: string };
  weight?: { value: number; unit: string };
  bmi?: number;
  blood_pressure_systolic?: number;
  blood_pressure_diastolic?: number;
  heart_rate?: number;
  respiratory_rate?: number;
  temperature?: { value: number; unit: string };
  oxygen_saturation?: number;
}

export interface ElationProblemResponse {
  id: number;
  patient: number;
  description: string;
  icd_codes?: string[];
  status: 'Active' | 'Resolved' | 'Inactive';
  onset_date?: string;
  resolution_date?: string;
  created_date: string;
  last_modified: string;
}

export interface ElationLabOrderResponse {
  id: number;
  patient: number;
  ordering_physician: number;
  order_date: string;
  status: 'Ordered' | 'In Progress' | 'Complete' | 'Cancelled';
  tests: Array<{
    name: string;
    result?: string;
    unit?: string;
    reference_range?: string;
    abnormal_flag?: string;
  }>;
  created_date: string;
  last_modified: string;
}
