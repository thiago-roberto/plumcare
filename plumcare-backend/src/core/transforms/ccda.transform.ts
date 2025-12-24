import type {
  Patient,
  Observation,
  Condition,
  AllergyIntolerance,
  MedicationStatement,
  Bundle,
  BundleEntry,
  Resource,
} from '@medplum/fhirtypes';
import { convertXmlToCcda, convertCcdaToFhir } from '@medplum/ccda';
import type { CCDADocument } from '../generators/ccda.generator.js';

/**
 * PlumCare meta tag to identify C-CDA sourced resources
 */
const PLUMCARE_CCDA_TAG = {
  system: 'http://plumcare.io/ehr-source',
  code: 'ccda',
  display: 'C-CDA Document',
};

/**
 * Add PlumCare meta tags to a FHIR resource
 */
function addPlumCareMetaTags<T extends Resource>(resource: T): T {
  return {
    ...resource,
    meta: {
      ...resource.meta,
      lastUpdated: new Date().toISOString(),
      tag: [
        ...(resource.meta?.tag || []),
        PLUMCARE_CCDA_TAG,
      ],
    },
  };
}

/**
 * Add PlumCare meta tags to all resources in a bundle
 */
function addPlumCareMetaTagsToBundle(bundle: Bundle): Bundle {
  return {
    ...bundle,
    entry: bundle.entry?.map((entry) => ({
      ...entry,
      resource: entry.resource ? addPlumCareMetaTags(entry.resource) : undefined,
    })),
  };
}

/**
 * Parse C-CDA document and extract Patient resource
 * Uses @medplum/ccda for parsing
 */
export function parseCcdaToPatient(document: CCDADocument | string): Patient | null {
  const xml = typeof document === 'string' ? document : document.xml;

  try {
    const ccda = convertXmlToCcda(xml);
    const bundle = convertCcdaToFhir(ccda);

    // Find Patient resource in the bundle
    const patientEntry = bundle.entry?.find(
      (entry) => entry.resource?.resourceType === 'Patient'
    );

    if (!patientEntry?.resource) return null;

    return addPlumCareMetaTags(patientEntry.resource as Patient);
  } catch (error) {
    console.error('Error parsing C-CDA to Patient:', error);
    return null;
  }
}

/**
 * Parse C-CDA Problems section to FHIR Conditions
 * Uses @medplum/ccda for parsing
 */
export function parseCcdaToConditions(document: CCDADocument | string, patientReference?: string): Condition[] {
  const xml = typeof document === 'string' ? document : document.xml;

  try {
    const ccda = convertXmlToCcda(xml);
    const bundle = convertCcdaToFhir(ccda);

    // Find all Condition resources in the bundle
    const conditions = bundle.entry
      ?.filter((entry) => entry.resource?.resourceType === 'Condition')
      .map((entry) => {
        const condition = entry.resource as Condition;
        // Update patient reference if provided
        if (patientReference) {
          condition.subject = { reference: patientReference };
        }
        return addPlumCareMetaTags(condition);
      }) || [];

    return conditions;
  } catch (error) {
    console.error('Error parsing C-CDA to Conditions:', error);
    return [];
  }
}

/**
 * Parse C-CDA Allergies section to FHIR AllergyIntolerance
 * Uses @medplum/ccda for parsing
 */
export function parseCcdaToAllergies(document: CCDADocument | string, patientReference?: string): AllergyIntolerance[] {
  const xml = typeof document === 'string' ? document : document.xml;

  try {
    const ccda = convertXmlToCcda(xml);
    const bundle = convertCcdaToFhir(ccda);

    // Find all AllergyIntolerance resources in the bundle
    const allergies = bundle.entry
      ?.filter((entry) => entry.resource?.resourceType === 'AllergyIntolerance')
      .map((entry) => {
        const allergy = entry.resource as AllergyIntolerance;
        // Update patient reference if provided
        if (patientReference) {
          allergy.patient = { reference: patientReference };
        }
        return addPlumCareMetaTags(allergy);
      }) || [];

    return allergies;
  } catch (error) {
    console.error('Error parsing C-CDA to Allergies:', error);
    return [];
  }
}

/**
 * Parse C-CDA Medications section to FHIR MedicationStatement
 * Uses @medplum/ccda for parsing
 *
 * Note: @medplum/ccda converts medications to MedicationRequest resources.
 * We extract them and convert to MedicationStatement for backward compatibility.
 */
export function parseCcdaToMedications(document: CCDADocument | string, patientReference?: string): MedicationStatement[] {
  const xml = typeof document === 'string' ? document : document.xml;

  try {
    const ccda = convertXmlToCcda(xml);
    const bundle = convertCcdaToFhir(ccda);

    // Medplum converts medications to MedicationRequest, but we need MedicationStatement
    // First check for MedicationStatement, then fallback to converting MedicationRequest
    const medicationStatements = bundle.entry
      ?.filter((entry) => entry.resource?.resourceType === 'MedicationStatement')
      .map((entry) => {
        const med = entry.resource as MedicationStatement;
        if (patientReference) {
          med.subject = { reference: patientReference };
        }
        return addPlumCareMetaTags(med);
      }) || [];

    if (medicationStatements.length > 0) {
      return medicationStatements;
    }

    // Convert MedicationRequest to MedicationStatement for backward compatibility
    const medicationRequests = bundle.entry
      ?.filter((entry) => entry.resource?.resourceType === 'MedicationRequest')
      .map((entry) => {
        const request = entry.resource as any;
        const statement: MedicationStatement = {
          resourceType: 'MedicationStatement',
          id: request.id,
          status: request.status === 'active' ? 'active' :
                  request.status === 'completed' ? 'completed' :
                  request.status === 'cancelled' ? 'not-taken' : 'unknown',
          medicationCodeableConcept: request.medicationCodeableConcept,
          subject: patientReference ? { reference: patientReference } : request.subject,
          effectiveDateTime: request.authoredOn,
          dateAsserted: new Date().toISOString(),
        };
        return addPlumCareMetaTags(statement);
      }) || [];

    return medicationRequests;
  } catch (error) {
    console.error('Error parsing C-CDA to Medications:', error);
    return [];
  }
}

/**
 * Parse C-CDA Results section to FHIR Observations
 * Uses @medplum/ccda for parsing
 */
export function parseCcdaToObservations(document: CCDADocument | string, patientReference?: string): Observation[] {
  const xml = typeof document === 'string' ? document : document.xml;

  try {
    const ccda = convertXmlToCcda(xml);
    const bundle = convertCcdaToFhir(ccda);

    // Find all Observation resources in the bundle
    const observations = bundle.entry
      ?.filter((entry) => entry.resource?.resourceType === 'Observation')
      .map((entry) => {
        const observation = entry.resource as Observation;
        // Update patient reference if provided
        if (patientReference) {
          observation.subject = { reference: patientReference };
        }
        return addPlumCareMetaTags(observation);
      }) || [];

    return observations;
  } catch (error) {
    console.error('Error parsing C-CDA to Observations:', error);
    return [];
  }
}

/**
 * Parse complete C-CDA document to FHIR Bundle
 * Uses @medplum/ccda for full document conversion
 */
export function parseCcdaToFhir(document: CCDADocument | string): Bundle {
  const xml = typeof document === 'string' ? document : document.xml;

  try {
    const ccda = convertXmlToCcda(xml);
    const bundle = convertCcdaToFhir(ccda);

    // Add PlumCare meta tags to all resources
    const taggedBundle = addPlumCareMetaTagsToBundle(bundle);

    // Convert to transaction bundle format for consistency with previous implementation
    const transactionBundle: Bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: taggedBundle.entry?.map((entry): BundleEntry => ({
        fullUrl: entry.fullUrl || (entry.resource?.id ? `urn:uuid:${entry.resource.id}` : undefined),
        resource: entry.resource,
        request: {
          method: 'POST',
          url: entry.resource?.resourceType || '',
        },
      })),
    };

    return transactionBundle;
  } catch (error) {
    console.error('Error parsing C-CDA to FHIR Bundle:', error);
    // Return empty bundle on error
    return {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [],
    };
  }
}

/**
 * Convert FHIR Bundle to C-CDA XML
 * Uses @medplum/ccda for conversion
 */
export { convertFhirToCcda, convertCcdaToXml } from '@medplum/ccda';
