// Utility exports
export * from './utils.js';

// HL7v2 generators
export {
  generateADT_A01,
  generateADT_A08,
  generateORU_R01,
  generateHL7v2Messages,
  type HL7v2Message,
} from './hl7v2.generator.js';

// C-CDA generators
export {
  generateCCD,
  generateDischargeSummary,
  generateProgressNote,
  generateCCDADocuments,
  type CCDADocument,
} from './ccda.generator.js';

// Athena generators
export {
  generateAthenaPatient,
  generateAthenaAppointment,
  generateAthenaEncounter,
  generateAthenaVitals,
  generateAthenaLabResult,
  generateAthenaProblem,
  generateAthenaAllergy,
  generateAthenaMedication,
  generateCompleteAthenaPatient,
  generateAthenaPatients,
  type AthenaPatient,
  type AthenaAppointment,
  type AthenaEncounter,
  type AthenaVitals,
  type AthenaLabResult,
  type AthenaProblem,
  type AthenaAllergy,
  type AthenaMedication,
} from './athena.generator.js';

// Elation generators
export {
  generateElationPatient,
  generateElationAppointment,
  generateElationVisitNote,
  generateElationProblem,
  generateElationAllergy,
  generateElationMedication,
  generateElationLabOrder,
  generateCompleteElationPatient,
  generateElationPatients,
  type ElationPatient,
  type ElationAppointment,
  type ElationVisitNote,
  type ElationProblem,
  type ElationAllergy,
  type ElationMedication,
  type ElationLabOrder,
} from './elation.generator.js';

// NextGen generators
export {
  generateNextGenPatient,
  generateNextGenAppointment,
  generateNextGenEncounter,
  generateNextGenProblem,
  generateNextGenAllergy,
  generateNextGenMedication,
  generateNextGenLabOrder,
  generateCompleteNextGenPatient,
  generateNextGenPatients,
  type NextGenPatient,
  type NextGenAppointment,
  type NextGenEncounter,
  type NextGenProblem,
  type NextGenAllergy,
  type NextGenMedication,
  type NextGenLabOrder,
} from './nextgen.generator.js';
