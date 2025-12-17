import type {
  Patient,
  Observation,
  Condition,
  AllergyIntolerance,
  MedicationStatement,
  Bundle,
  BundleEntry,
} from '@medplum/fhirtypes';
import { v4 as uuidv4 } from 'uuid';
import type { CCDADocument } from '../generators/ccda.generator.js';

// Simple XML parser utilities (no external dependencies)
interface XMLElement {
  tagName: string;
  attributes: Record<string, string>;
  children: XMLElement[];
  text: string;
}

function parseXMLSimple(xml: string): XMLElement | null {
  // Remove XML declaration and comments
  xml = xml.replace(/<\?xml[^?]*\?>/g, '');
  xml = xml.replace(/<!--[\s\S]*?-->/g, '');
  xml = xml.trim();

  const stack: XMLElement[] = [];
  let current: XMLElement | null = null;
  let root: XMLElement | null = null;

  // Simple regex-based parsing
  const tagRegex = /<\/?([a-zA-Z0-9:_-]+)([^>]*)>/g;
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(xml)) !== null) {
    const [fullMatch, tagName, attrString] = match;
    const isClosing = fullMatch.startsWith('</');
    const isSelfClosing = fullMatch.endsWith('/>') || attrString.endsWith('/');

    // Get text before this tag
    const textBefore = xml.substring(lastIndex, match.index).trim();
    if (textBefore && current) {
      current.text += textBefore;
    }

    if (!isClosing) {
      // Parse attributes
      const attributes: Record<string, string> = {};
      const attrRegex = /([a-zA-Z0-9:_-]+)="([^"]*)"/g;
      let attrMatch;
      while ((attrMatch = attrRegex.exec(attrString)) !== null) {
        attributes[attrMatch[1]] = attrMatch[2];
      }

      const element: XMLElement = {
        tagName: tagName.replace(/^[a-z]+:/, ''), // Remove namespace prefix
        attributes,
        children: [],
        text: '',
      };

      if (current) {
        current.children.push(element);
      }

      if (!root) {
        root = element;
      }

      if (!isSelfClosing) {
        stack.push(element);
        current = element;
      }
    } else {
      // Closing tag
      stack.pop();
      current = stack.length > 0 ? stack[stack.length - 1] : null;
    }

    lastIndex = match.index + fullMatch.length;
  }

  return root;
}

function findElements(element: XMLElement | null, tagName: string): XMLElement[] {
  if (!element) return [];

  const results: XMLElement[] = [];

  if (element.tagName === tagName) {
    results.push(element);
  }

  for (const child of element.children) {
    results.push(...findElements(child, tagName));
  }

  return results;
}

function findElement(element: XMLElement | null, tagName: string): XMLElement | null {
  const elements = findElements(element, tagName);
  return elements.length > 0 ? elements[0] : null;
}

function getAttributeValue(element: XMLElement | null, attr: string): string {
  return element?.attributes[attr] || '';
}

function getElementText(element: XMLElement | null): string {
  return element?.text || '';
}

function mapCcdaGender(code: string): 'male' | 'female' | 'other' | 'unknown' {
  switch (code.toUpperCase()) {
    case 'M': return 'male';
    case 'F': return 'female';
    case 'UN': return 'other';
    default: return 'unknown';
  }
}

function parseCcdaDate(dateStr: string): string | undefined {
  if (!dateStr || dateStr.length < 8) return undefined;

  const year = dateStr.substring(0, 4);
  const month = dateStr.substring(4, 6);
  const day = dateStr.substring(6, 8);

  if (dateStr.length >= 14) {
    const hour = dateStr.substring(8, 10);
    const minute = dateStr.substring(10, 12);
    const second = dateStr.substring(12, 14);
    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
  }

  return `${year}-${month}-${day}`;
}

/**
 * Parse C-CDA document and extract Patient resource
 */
export function parseCcdaToPatient(document: CCDADocument | string): Patient | null {
  const xml = typeof document === 'string' ? document : document.xml;
  const root = parseXMLSimple(xml);

  if (!root) return null;

  const recordTarget = findElement(root, 'recordTarget');
  const patientRole = findElement(recordTarget, 'patientRole');
  const patient = findElement(patientRole, 'patient');

  if (!patient) return null;

  // Get identifiers
  const ids = findElements(patientRole, 'id');
  const identifiers = ids.map(id => ({
    system: `urn:oid:${getAttributeValue(id, 'root')}`,
    value: getAttributeValue(id, 'extension'),
  })).filter(i => i.value);

  // Get name
  const name = findElement(patient, 'name');
  const given = findElements(name, 'given').map(g => getElementText(g) || g.text).filter(Boolean);
  const family = getElementText(findElement(name, 'family'));

  // Get gender
  const genderCode = findElement(patient, 'administrativeGenderCode');
  const gender = mapCcdaGender(getAttributeValue(genderCode, 'code'));

  // Get birth date
  const birthTime = findElement(patient, 'birthTime');
  const birthDate = parseCcdaDate(getAttributeValue(birthTime, 'value'));

  // Get address
  const addr = findElement(patientRole, 'addr');
  const streetAddress = getElementText(findElement(addr, 'streetAddressLine'));
  const city = getElementText(findElement(addr, 'city'));
  const state = getElementText(findElement(addr, 'state'));
  const postalCode = getElementText(findElement(addr, 'postalCode'));
  const country = getElementText(findElement(addr, 'country'));

  // Get telecom
  const telecoms = findElements(patientRole, 'telecom');

  // Get race and ethnicity
  const raceCode = findElement(patient, 'raceCode');
  const ethnicGroupCode = findElement(patient, 'ethnicGroupCode');

  const fhirPatient: Patient = {
    resourceType: 'Patient',
    id: uuidv4(),
    identifier: identifiers.length > 0 ? identifiers : undefined,
    name: [{
      use: 'official',
      family,
      given,
    }],
    gender,
    birthDate: birthDate?.split('T')[0],
    address: streetAddress || city ? [{
      use: 'home',
      line: streetAddress ? [streetAddress] : undefined,
      city: city || undefined,
      state: state || undefined,
      postalCode: postalCode || undefined,
      country: country || undefined,
    }] : undefined,
    telecom: telecoms.map(t => {
      const value = getAttributeValue(t, 'value');
      const use = getAttributeValue(t, 'use');
      if (value.startsWith('tel:')) {
        return {
          system: 'phone' as const,
          value: value.replace('tel:', ''),
          use: use === 'HP' ? 'home' as const : use === 'WP' ? 'work' as const : 'home' as const,
        };
      } else if (value.startsWith('mailto:')) {
        return {
          system: 'email' as const,
          value: value.replace('mailto:', ''),
        };
      }
      return null;
    }).filter(Boolean) as Patient['telecom'],
    extension: [],
    meta: {
      lastUpdated: new Date().toISOString(),
      tag: [{
        system: 'http://plumcare.io/ehr-source',
        code: 'ccda',
        display: 'C-CDA Document',
      }],
    },
  };

  // Add race extension
  if (raceCode) {
    fhirPatient.extension?.push({
      url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race',
      extension: [{
        url: 'ombCategory',
        valueCoding: {
          system: 'urn:oid:2.16.840.1.113883.6.238',
          code: getAttributeValue(raceCode, 'code'),
          display: getAttributeValue(raceCode, 'displayName'),
        },
      }],
    });
  }

  // Add ethnicity extension
  if (ethnicGroupCode) {
    fhirPatient.extension?.push({
      url: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-ethnicity',
      extension: [{
        url: 'ombCategory',
        valueCoding: {
          system: 'urn:oid:2.16.840.1.113883.6.238',
          code: getAttributeValue(ethnicGroupCode, 'code'),
          display: getAttributeValue(ethnicGroupCode, 'displayName'),
        },
      }],
    });
  }

  return fhirPatient;
}

/**
 * Parse C-CDA Problems section to FHIR Conditions
 */
export function parseCcdaToConditions(document: CCDADocument | string, patientReference?: string): Condition[] {
  const xml = typeof document === 'string' ? document : document.xml;
  const root = parseXMLSimple(xml);

  if (!root) return [];

  const conditions: Condition[] = [];

  // Find problem section
  const sections = findElements(root, 'section');
  const problemSection = sections.find(s => {
    const code = findElement(s, 'code');
    return getAttributeValue(code, 'code') === '11450-4'; // Problem List LOINC code
  });

  if (!problemSection) return [];

  // Find all problem observations
  const observations = findElements(problemSection, 'observation');

  for (const obs of observations) {
    const valueEl = findElement(obs, 'value');
    if (!valueEl) continue;

    const code = getAttributeValue(valueEl, 'code');
    const display = getAttributeValue(valueEl, 'displayName');
    const codeSystem = getAttributeValue(valueEl, 'codeSystem');

    const effectiveTime = findElement(obs, 'effectiveTime');
    const lowTime = findElement(effectiveTime, 'low');
    const onsetDate = parseCcdaDate(getAttributeValue(lowTime, 'value'));

    const condition: Condition = {
      resourceType: 'Condition',
      id: uuidv4(),
      clinicalStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: 'active',
          display: 'Active',
        }],
      },
      verificationStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'confirmed',
          display: 'Confirmed',
        }],
      },
      code: {
        coding: [{
          system: codeSystem === '2.16.840.1.113883.6.90' ? 'http://hl7.org/fhir/sid/icd-10-cm' : `urn:oid:${codeSystem}`,
          code,
          display,
        }],
        text: display,
      },
      subject: { reference: patientReference || 'Patient/unknown' },
      onsetDateTime: onsetDate,
      recordedDate: new Date().toISOString(),
      meta: {
        lastUpdated: new Date().toISOString(),
        tag: [{
          system: 'http://plumcare.io/ehr-source',
          code: 'ccda',
          display: 'C-CDA Document',
        }],
      },
    };

    conditions.push(condition);
  }

  return conditions;
}

/**
 * Parse C-CDA Allergies section to FHIR AllergyIntolerance
 */
export function parseCcdaToAllergies(document: CCDADocument | string, patientReference?: string): AllergyIntolerance[] {
  const xml = typeof document === 'string' ? document : document.xml;
  const root = parseXMLSimple(xml);

  if (!root) return [];

  const allergies: AllergyIntolerance[] = [];

  // Find allergies section
  const sections = findElements(root, 'section');
  const allergySection = sections.find(s => {
    const code = findElement(s, 'code');
    return getAttributeValue(code, 'code') === '48765-2'; // Allergies LOINC code
  });

  if (!allergySection) return [];

  // Find all allergy observations
  const observations = findElements(allergySection, 'observation');

  for (const obs of observations) {
    const participant = findElement(obs, 'participant');
    const playingEntity = findElement(participant, 'playingEntity');
    const codeEl = findElement(playingEntity, 'code');

    if (!codeEl) continue;

    const code = getAttributeValue(codeEl, 'code');
    const display = getAttributeValue(codeEl, 'displayName');
    const codeSystem = getAttributeValue(codeEl, 'codeSystem');

    // Get reaction
    const reactionObs = findElement(obs, 'entryRelationship');
    const reactionValue = findElement(reactionObs, 'value');
    const reactionDisplay = getAttributeValue(reactionValue, 'displayName');

    const allergy: AllergyIntolerance = {
      resourceType: 'AllergyIntolerance',
      id: uuidv4(),
      clinicalStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical',
          code: 'active',
          display: 'Active',
        }],
      },
      verificationStatus: {
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/allergyintolerance-verification',
          code: 'confirmed',
          display: 'Confirmed',
        }],
      },
      code: {
        coding: [{
          system: codeSystem === '2.16.840.1.113883.6.96' ? 'http://snomed.info/sct' : `urn:oid:${codeSystem}`,
          code,
          display,
        }],
        text: display,
      },
      patient: { reference: patientReference || 'Patient/unknown' },
      reaction: reactionDisplay ? [{
        manifestation: [{
          coding: [{
            display: reactionDisplay,
          }],
          text: reactionDisplay,
        }],
      }] : undefined,
      recordedDate: new Date().toISOString(),
      meta: {
        lastUpdated: new Date().toISOString(),
        tag: [{
          system: 'http://plumcare.io/ehr-source',
          code: 'ccda',
          display: 'C-CDA Document',
        }],
      },
    };

    allergies.push(allergy);
  }

  return allergies;
}

/**
 * Parse C-CDA Medications section to FHIR MedicationStatement
 */
export function parseCcdaToMedications(document: CCDADocument | string, patientReference?: string): MedicationStatement[] {
  const xml = typeof document === 'string' ? document : document.xml;
  const root = parseXMLSimple(xml);

  if (!root) return [];

  const medications: MedicationStatement[] = [];

  // Find medications section
  const sections = findElements(root, 'section');
  const medSection = sections.find(s => {
    const code = findElement(s, 'code');
    return getAttributeValue(code, 'code') === '10160-0'; // Medications LOINC code
  });

  if (!medSection) return [];

  // Find all medication administrations
  const substanceAdmins = findElements(medSection, 'substanceAdministration');

  for (const admin of substanceAdmins) {
    const consumable = findElement(admin, 'consumable');
    const manufacturedProduct = findElement(consumable, 'manufacturedProduct');
    const manufacturedMaterial = findElement(manufacturedProduct, 'manufacturedMaterial');
    const codeEl = findElement(manufacturedMaterial, 'code');

    if (!codeEl) continue;

    const code = getAttributeValue(codeEl, 'code');
    const display = getAttributeValue(codeEl, 'displayName');
    const codeSystem = getAttributeValue(codeEl, 'codeSystem');

    const effectiveTime = findElement(admin, 'effectiveTime');
    const lowTime = findElement(effectiveTime, 'low');
    const startDate = parseCcdaDate(getAttributeValue(lowTime, 'value'));

    const medication: MedicationStatement = {
      resourceType: 'MedicationStatement',
      id: uuidv4(),
      status: 'active',
      medicationCodeableConcept: {
        coding: [{
          system: codeSystem === '2.16.840.1.113883.6.88' ? 'http://www.nlm.nih.gov/research/umls/rxnorm' : `urn:oid:${codeSystem}`,
          code,
          display,
        }],
        text: display,
      },
      subject: patientReference ? { reference: patientReference } : { reference: 'Patient/unknown' },
      effectiveDateTime: startDate,
      dateAsserted: new Date().toISOString(),
      meta: {
        lastUpdated: new Date().toISOString(),
        tag: [{
          system: 'http://plumcare.io/ehr-source',
          code: 'ccda',
          display: 'C-CDA Document',
        }],
      },
    };

    medications.push(medication);
  }

  return medications;
}

/**
 * Parse C-CDA Results section to FHIR Observations
 */
export function parseCcdaToObservations(document: CCDADocument | string, patientReference?: string): Observation[] {
  const xml = typeof document === 'string' ? document : document.xml;
  const root = parseXMLSimple(xml);

  if (!root) return [];

  const observations: Observation[] = [];

  // Find results section
  const sections = findElements(root, 'section');
  const resultsSection = sections.find(s => {
    const code = findElement(s, 'code');
    return getAttributeValue(code, 'code') === '30954-2'; // Results LOINC code
  });

  if (!resultsSection) return [];

  // Find all observations
  const obsElements = findElements(resultsSection, 'observation');

  for (const obs of obsElements) {
    const codeEl = findElement(obs, 'code');
    if (!codeEl) continue;

    const code = getAttributeValue(codeEl, 'code');
    const display = getAttributeValue(codeEl, 'displayName');
    const codeSystem = getAttributeValue(codeEl, 'codeSystem');

    const valueEl = findElement(obs, 'value');
    const value = getAttributeValue(valueEl, 'value');
    const unit = getAttributeValue(valueEl, 'unit');

    const effectiveTime = findElement(obs, 'effectiveTime');
    const effectiveDateTime = parseCcdaDate(getAttributeValue(effectiveTime, 'value'));

    const interpretationCode = findElement(obs, 'interpretationCode');
    const interpretation = getAttributeValue(interpretationCode, 'code');

    const referenceRange = findElement(obs, 'referenceRange');
    const observationRange = findElement(referenceRange, 'observationRange');
    const rangeValue = findElement(observationRange, 'value');
    const lowEl = findElement(rangeValue, 'low');
    const highEl = findElement(rangeValue, 'high');

    const observation: Observation = {
      resourceType: 'Observation',
      id: uuidv4(),
      status: 'final',
      code: {
        coding: [{
          system: codeSystem === '2.16.840.1.113883.6.1' ? 'http://loinc.org' : `urn:oid:${codeSystem}`,
          code,
          display,
        }],
        text: display,
      },
      subject: { reference: patientReference || 'Patient/unknown' },
      effectiveDateTime,
      valueQuantity: value ? {
        value: parseFloat(value),
        unit,
        system: 'http://unitsofmeasure.org',
        code: unit,
      } : undefined,
      interpretation: interpretation ? [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
          code: interpretation,
        }],
      }] : undefined,
      referenceRange: lowEl || highEl ? [{
        low: lowEl ? {
          value: parseFloat(getAttributeValue(lowEl, 'value')),
          unit: getAttributeValue(lowEl, 'unit'),
        } : undefined,
        high: highEl ? {
          value: parseFloat(getAttributeValue(highEl, 'value')),
          unit: getAttributeValue(highEl, 'unit'),
        } : undefined,
      }] : undefined,
      meta: {
        lastUpdated: new Date().toISOString(),
        tag: [{
          system: 'http://plumcare.io/ehr-source',
          code: 'ccda',
          display: 'C-CDA Document',
        }],
      },
    };

    observations.push(observation);
  }

  // Also check vital signs section
  const vitalSection = sections.find(s => {
    const code = findElement(s, 'code');
    return getAttributeValue(code, 'code') === '8716-3'; // Vital Signs LOINC code
  });

  if (vitalSection) {
    const vitalObs = findElements(vitalSection, 'observation');
    for (const obs of vitalObs) {
      const codeEl = findElement(obs, 'code');
      if (!codeEl) continue;

      const code = getAttributeValue(codeEl, 'code');
      const display = getAttributeValue(codeEl, 'displayName');

      const valueEl = findElement(obs, 'value');
      const value = getAttributeValue(valueEl, 'value');
      const unit = getAttributeValue(valueEl, 'unit');

      const effectiveTime = findElement(obs, 'effectiveTime');
      const effectiveDateTime = parseCcdaDate(getAttributeValue(effectiveTime, 'value'));

      const observation: Observation = {
        resourceType: 'Observation',
        id: uuidv4(),
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs',
          }],
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code,
            display,
          }],
          text: display,
        },
        subject: { reference: patientReference || 'Patient/unknown' },
        effectiveDateTime,
        valueQuantity: value ? {
          value: parseFloat(value),
          unit,
          system: 'http://unitsofmeasure.org',
          code: unit,
        } : undefined,
        meta: {
          lastUpdated: new Date().toISOString(),
          tag: [{
            system: 'http://plumcare.io/ehr-source',
            code: 'ccda',
            display: 'C-CDA Document',
          }],
        },
      };

      observations.push(observation);
    }
  }

  return observations;
}

/**
 * Parse complete C-CDA document to FHIR Bundle
 */
export function parseCcdaToFhir(document: CCDADocument | string): Bundle {
  const entries: BundleEntry[] = [];

  // Parse patient
  const patient = parseCcdaToPatient(document);
  if (patient) {
    entries.push({
      fullUrl: `urn:uuid:${patient.id}`,
      resource: patient,
      request: {
        method: 'POST',
        url: 'Patient',
      },
    });
  }

  const patientReference = patient ? `Patient/${patient.id}` : undefined;

  // Parse conditions
  const conditions = parseCcdaToConditions(document, patientReference);
  for (const condition of conditions) {
    entries.push({
      fullUrl: `urn:uuid:${condition.id}`,
      resource: condition,
      request: {
        method: 'POST',
        url: 'Condition',
      },
    });
  }

  // Parse allergies
  const allergies = parseCcdaToAllergies(document, patientReference);
  for (const allergy of allergies) {
    entries.push({
      fullUrl: `urn:uuid:${allergy.id}`,
      resource: allergy,
      request: {
        method: 'POST',
        url: 'AllergyIntolerance',
      },
    });
  }

  // Parse medications
  const medications = parseCcdaToMedications(document, patientReference);
  for (const medication of medications) {
    entries.push({
      fullUrl: `urn:uuid:${medication.id}`,
      resource: medication,
      request: {
        method: 'POST',
        url: 'MedicationStatement',
      },
    });
  }

  // Parse observations
  const observations = parseCcdaToObservations(document, patientReference);
  for (const observation of observations) {
    entries.push({
      fullUrl: `urn:uuid:${observation.id}`,
      resource: observation,
      request: {
        method: 'POST',
        url: 'Observation',
      },
    });
  }

  return {
    resourceType: 'Bundle',
    type: 'transaction',
    entry: entries,
  };
}
