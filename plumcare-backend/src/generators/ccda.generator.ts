import {
  faker,
  generatePatientData,
  generateEncounterData,
  generateAllergy,
  generateMedication,
  generateDiagnosis,
  generateLabTest,
  generateVitalSign,
  generateProvider,
  generateFacility,
  generateUUID,
  PatientData,
  EncounterData,
} from './utils.js';

export interface CCDADocument {
  documentId: string;
  templateType: 'CCD' | 'DischargeSum' | 'ProgressNote';
  xml: string;
  parsed: {
    patientData: PatientData;
    encounterData?: EncounterData;
    createdAt: Date;
  };
}

// C-CDA Template OIDs
const TEMPLATE_OIDS = {
  CCD: '2.16.840.1.113883.10.20.22.1.2',
  DischargeSum: '2.16.840.1.113883.10.20.22.1.8',
  ProgressNote: '2.16.840.1.113883.10.20.22.1.9',
  Allergies: '2.16.840.1.113883.10.20.22.2.6.1',
  Medications: '2.16.840.1.113883.10.20.22.2.1.1',
  Problems: '2.16.840.1.113883.10.20.22.2.5.1',
  Results: '2.16.840.1.113883.10.20.22.2.3.1',
  VitalSigns: '2.16.840.1.113883.10.20.22.2.4.1',
  Encounters: '2.16.840.1.113883.10.20.22.2.22.1',
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatCcdaDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}-0500`;
}

function formatCcdaDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

function getGenderCode(gender: string): { code: string; display: string } {
  switch (gender) {
    case 'male':
      return { code: 'M', display: 'Male' };
    case 'female':
      return { code: 'F', display: 'Female' };
    case 'other':
      return { code: 'UN', display: 'Undifferentiated' };
    default:
      return { code: 'UNK', display: 'Unknown' };
  }
}

function getRaceDisplay(code: string): string {
  const races: Record<string, string> = {
    '2106-3': 'White',
    '2054-5': 'Black or African American',
    '2028-9': 'Asian',
    '2076-8': 'Native Hawaiian or Other Pacific Islander',
    '2131-1': 'Other Race',
  };
  return races[code] || 'Unknown';
}

function getEthnicityDisplay(code: string): string {
  return code === '2135-2' ? 'Hispanic or Latino' : 'Not Hispanic or Latino';
}

function buildHeader(
  documentId: string,
  templateOid: string,
  title: string,
  patient: PatientData,
  provider: ReturnType<typeof generateProvider>,
  facility: ReturnType<typeof generateFacility>,
  effectiveTime: Date
): string {
  const genderInfo = getGenderCode(patient.gender);

  return `<?xml version="1.0" encoding="UTF-8"?>
<?xml-stylesheet type="text/xsl" href="CDA.xsl"?>
<ClinicalDocument xmlns="urn:hl7-org:v3" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:voc="urn:hl7-org:v3/voc" xmlns:sdtc="urn:hl7-org:sdtc">
  <realmCode code="US"/>
  <typeId root="2.16.840.1.113883.1.3" extension="POCD_HD000040"/>
  <templateId root="${templateOid}"/>
  <templateId root="2.16.840.1.113883.10.20.22.1.1"/>
  <id root="${documentId}"/>
  <code code="34133-9" codeSystem="2.16.840.1.113883.6.1" codeSystemName="LOINC" displayName="${escapeXml(title)}"/>
  <title>${escapeXml(title)}</title>
  <effectiveTime value="${formatCcdaDateTime(effectiveTime)}"/>
  <confidentialityCode code="N" codeSystem="2.16.840.1.113883.5.25"/>
  <languageCode code="en-US"/>
  <setId root="${generateUUID()}"/>
  <versionNumber value="1"/>
  <recordTarget>
    <patientRole>
      <id root="2.16.840.1.113883.4.1" extension="${patient.ssn.replace(/-/g, '')}"/>
      <id root="2.16.840.1.113883.4.3" extension="${patient.mrn}"/>
      <addr use="HP">
        <streetAddressLine>${escapeXml(patient.address.street)}</streetAddressLine>
        <city>${escapeXml(patient.address.city)}</city>
        <state>${patient.address.state}</state>
        <postalCode>${patient.address.postalCode}</postalCode>
        <country>${patient.address.country}</country>
      </addr>
      <telecom use="HP" value="tel:${patient.phone.replace(/\D/g, '')}"/>
      <telecom use="HP" value="mailto:${patient.email}"/>
      <patient>
        <name use="L">
          <given>${escapeXml(patient.firstName)}</given>
          ${patient.middleName ? `<given>${escapeXml(patient.middleName)}</given>` : ''}
          <family>${escapeXml(patient.lastName)}</family>
        </name>
        <administrativeGenderCode code="${genderInfo.code}" codeSystem="2.16.840.1.113883.5.1" displayName="${genderInfo.display}"/>
        <birthTime value="${formatCcdaDate(patient.dob)}"/>
        <raceCode code="${patient.race}" codeSystem="2.16.840.1.113883.6.238" displayName="${getRaceDisplay(patient.race)}"/>
        <ethnicGroupCode code="${patient.ethnicity}" codeSystem="2.16.840.1.113883.6.238" displayName="${getEthnicityDisplay(patient.ethnicity)}"/>
        <languageCommunication>
          <languageCode code="${patient.language}"/>
          <preferenceInd value="true"/>
        </languageCommunication>
      </patient>
    </patientRole>
  </recordTarget>
  <author>
    <time value="${formatCcdaDateTime(effectiveTime)}"/>
    <assignedAuthor>
      <id root="2.16.840.1.113883.4.6" extension="${provider.npi}"/>
      <addr use="WP">
        <streetAddressLine>123 Medical Center Dr</streetAddressLine>
        <city>Boston</city>
        <state>MA</state>
        <postalCode>02101</postalCode>
        <country>USA</country>
      </addr>
      <telecom use="WP" value="tel:5551234567"/>
      <assignedPerson>
        <name>
          <given>${escapeXml(provider.firstName)}</given>
          <family>${escapeXml(provider.lastName)}</family>
          <suffix>MD</suffix>
        </name>
      </assignedPerson>
    </assignedAuthor>
  </author>
  <custodian>
    <assignedCustodian>
      <representedCustodianOrganization>
        <id root="2.16.840.1.113883.4.6" extension="${facility.npi}"/>
        <name>${escapeXml(facility.name)}</name>
        <telecom use="WP" value="tel:5559876543"/>
        <addr use="WP">
          <streetAddressLine>100 Hospital Way</streetAddressLine>
          <city>Boston</city>
          <state>MA</state>
          <postalCode>02101</postalCode>
          <country>USA</country>
        </addr>
      </representedCustodianOrganization>
    </assignedCustodian>
  </custodian>
  <documentationOf>
    <serviceEvent classCode="PCPR">
      <effectiveTime>
        <low value="${formatCcdaDateTime(new Date(effectiveTime.getTime() - 365 * 24 * 60 * 60 * 1000))}"/>
        <high value="${formatCcdaDateTime(effectiveTime)}"/>
      </effectiveTime>
      <performer typeCode="PRF">
        <assignedEntity>
          <id root="2.16.840.1.113883.4.6" extension="${provider.npi}"/>
          <assignedPerson>
            <name>
              <given>${escapeXml(provider.firstName)}</given>
              <family>${escapeXml(provider.lastName)}</family>
            </name>
          </assignedPerson>
        </assignedEntity>
      </performer>
    </serviceEvent>
  </documentationOf>`;
}

function buildAllergiesSection(allergies: ReturnType<typeof generateAllergy>[]): string {
  if (allergies.length === 0) {
    return `
  <component>
    <section nullFlavor="NI">
      <templateId root="${TEMPLATE_OIDS.Allergies}"/>
      <code code="48765-2" codeSystem="2.16.840.1.113883.6.1" displayName="Allergies"/>
      <title>Allergies</title>
      <text>No known allergies</text>
    </section>
  </component>`;
  }

  const allergyEntries = allergies
    .map((allergy, index) => {
      const entryId = generateUUID();
      return `
      <entry typeCode="DRIV">
        <act classCode="ACT" moodCode="EVN">
          <templateId root="2.16.840.1.113883.10.20.22.4.30"/>
          <id root="${entryId}"/>
          <code code="CONC" codeSystem="2.16.840.1.113883.5.6"/>
          <statusCode code="active"/>
          <effectiveTime>
            <low value="${formatCcdaDate(faker.date.past({ years: 5 }))}"/>
          </effectiveTime>
          <entryRelationship typeCode="SUBJ">
            <observation classCode="OBS" moodCode="EVN">
              <templateId root="2.16.840.1.113883.10.20.22.4.7"/>
              <id root="${generateUUID()}"/>
              <code code="ASSERTION" codeSystem="2.16.840.1.113883.5.4"/>
              <statusCode code="completed"/>
              <effectiveTime>
                <low value="${formatCcdaDate(faker.date.past({ years: 5 }))}"/>
              </effectiveTime>
              <value xsi:type="CD" code="419199007" codeSystem="2.16.840.1.113883.6.96" displayName="Allergy to substance"/>
              <participant typeCode="CSM">
                <participantRole classCode="MANU">
                  <playingEntity classCode="MMAT">
                    <code code="${allergy.code}" codeSystem="2.16.840.1.113883.6.96" displayName="${escapeXml(allergy.display)}"/>
                  </playingEntity>
                </participantRole>
              </participant>
              <entryRelationship typeCode="MFST" inversionInd="true">
                <observation classCode="OBS" moodCode="EVN">
                  <templateId root="2.16.840.1.113883.10.20.22.4.9"/>
                  <id root="${generateUUID()}"/>
                  <code code="ASSERTION" codeSystem="2.16.840.1.113883.5.4"/>
                  <statusCode code="completed"/>
                  <value xsi:type="CD" code="422587007" codeSystem="2.16.840.1.113883.6.96" displayName="${escapeXml(allergy.reaction)}"/>
                </observation>
              </entryRelationship>
            </observation>
          </entryRelationship>
        </act>
      </entry>`;
    })
    .join('');

  const allergyText = allergies
    .map((a, i) => `<tr><td>${i + 1}</td><td>${escapeXml(a.display)}</td><td>${escapeXml(a.reaction)}</td><td>Active</td></tr>`)
    .join('');

  return `
  <component>
    <section>
      <templateId root="${TEMPLATE_OIDS.Allergies}"/>
      <code code="48765-2" codeSystem="2.16.840.1.113883.6.1" displayName="Allergies"/>
      <title>Allergies and Adverse Reactions</title>
      <text>
        <table border="1" width="100%">
          <thead><tr><th>#</th><th>Allergen</th><th>Reaction</th><th>Status</th></tr></thead>
          <tbody>${allergyText}</tbody>
        </table>
      </text>
      ${allergyEntries}
    </section>
  </component>`;
}

function buildMedicationsSection(medications: ReturnType<typeof generateMedication>[]): string {
  if (medications.length === 0) {
    return `
  <component>
    <section nullFlavor="NI">
      <templateId root="${TEMPLATE_OIDS.Medications}"/>
      <code code="10160-0" codeSystem="2.16.840.1.113883.6.1" displayName="Medications"/>
      <title>Medications</title>
      <text>No current medications</text>
    </section>
  </component>`;
  }

  const medicationEntries = medications
    .map((med) => {
      return `
      <entry typeCode="DRIV">
        <substanceAdministration classCode="SBADM" moodCode="EVN">
          <templateId root="2.16.840.1.113883.10.20.22.4.16"/>
          <id root="${generateUUID()}"/>
          <statusCode code="active"/>
          <effectiveTime xsi:type="IVL_TS">
            <low value="${formatCcdaDate(faker.date.past({ years: 1 }))}"/>
          </effectiveTime>
          <effectiveTime xsi:type="PIVL_TS" institutionSpecified="true" operator="A">
            <period value="1" unit="d"/>
          </effectiveTime>
          <doseQuantity value="1"/>
          <consumable>
            <manufacturedProduct classCode="MANU">
              <templateId root="2.16.840.1.113883.10.20.22.4.23"/>
              <manufacturedMaterial>
                <code code="${med.rxnorm}" codeSystem="2.16.840.1.113883.6.88" displayName="${escapeXml(med.display)}"/>
              </manufacturedMaterial>
            </manufacturedProduct>
          </consumable>
        </substanceAdministration>
      </entry>`;
    })
    .join('');

  const medText = medications
    .map((m, i) => `<tr><td>${i + 1}</td><td>${escapeXml(m.display)}</td><td>${m.dosage}</td><td>${m.frequency}</td><td>Active</td></tr>`)
    .join('');

  return `
  <component>
    <section>
      <templateId root="${TEMPLATE_OIDS.Medications}"/>
      <code code="10160-0" codeSystem="2.16.840.1.113883.6.1" displayName="Medications"/>
      <title>Medications</title>
      <text>
        <table border="1" width="100%">
          <thead><tr><th>#</th><th>Medication</th><th>Dose</th><th>Frequency</th><th>Status</th></tr></thead>
          <tbody>${medText}</tbody>
        </table>
      </text>
      ${medicationEntries}
    </section>
  </component>`;
}

function buildProblemsSection(problems: ReturnType<typeof generateDiagnosis>[]): string {
  if (problems.length === 0) {
    return `
  <component>
    <section nullFlavor="NI">
      <templateId root="${TEMPLATE_OIDS.Problems}"/>
      <code code="11450-4" codeSystem="2.16.840.1.113883.6.1" displayName="Problem List"/>
      <title>Problems</title>
      <text>No known problems</text>
    </section>
  </component>`;
  }

  const problemEntries = problems
    .map((problem) => {
      return `
      <entry typeCode="DRIV">
        <act classCode="ACT" moodCode="EVN">
          <templateId root="2.16.840.1.113883.10.20.22.4.3"/>
          <id root="${generateUUID()}"/>
          <code code="CONC" codeSystem="2.16.840.1.113883.5.6"/>
          <statusCode code="active"/>
          <effectiveTime>
            <low value="${formatCcdaDate(faker.date.past({ years: 3 }))}"/>
          </effectiveTime>
          <entryRelationship typeCode="SUBJ">
            <observation classCode="OBS" moodCode="EVN">
              <templateId root="2.16.840.1.113883.10.20.22.4.4"/>
              <id root="${generateUUID()}"/>
              <code code="64572001" codeSystem="2.16.840.1.113883.6.96" displayName="Condition">
                <translation code="75323-6" codeSystem="2.16.840.1.113883.6.1" displayName="Condition"/>
              </code>
              <statusCode code="completed"/>
              <effectiveTime>
                <low value="${formatCcdaDate(faker.date.past({ years: 3 }))}"/>
              </effectiveTime>
              <value xsi:type="CD" code="${problem.code}" codeSystem="2.16.840.1.113883.6.90" displayName="${escapeXml(problem.display)}"/>
            </observation>
          </entryRelationship>
        </act>
      </entry>`;
    })
    .join('');

  const problemText = problems
    .map((p, i) => `<tr><td>${i + 1}</td><td>${p.code}</td><td>${escapeXml(p.display)}</td><td>Active</td></tr>`)
    .join('');

  return `
  <component>
    <section>
      <templateId root="${TEMPLATE_OIDS.Problems}"/>
      <code code="11450-4" codeSystem="2.16.840.1.113883.6.1" displayName="Problem List"/>
      <title>Problems</title>
      <text>
        <table border="1" width="100%">
          <thead><tr><th>#</th><th>ICD-10</th><th>Description</th><th>Status</th></tr></thead>
          <tbody>${problemText}</tbody>
        </table>
      </text>
      ${problemEntries}
    </section>
  </component>`;
}

function buildResultsSection(results: ReturnType<typeof generateLabTest>[]): string {
  if (results.length === 0) {
    return `
  <component>
    <section nullFlavor="NI">
      <templateId root="${TEMPLATE_OIDS.Results}"/>
      <code code="30954-2" codeSystem="2.16.840.1.113883.6.1" displayName="Results"/>
      <title>Results</title>
      <text>No results available</text>
    </section>
  </component>`;
  }

  const resultEntries = results
    .map((result) => {
      return `
        <component>
          <observation classCode="OBS" moodCode="EVN">
            <templateId root="2.16.840.1.113883.10.20.22.4.2"/>
            <id root="${generateUUID()}"/>
            <code code="${result.code}" codeSystem="2.16.840.1.113883.6.1" displayName="${escapeXml(result.display)}"/>
            <statusCode code="completed"/>
            <effectiveTime value="${formatCcdaDateTime(new Date())}"/>
            <value xsi:type="PQ" value="${result.value}" unit="${result.unit}"/>
            <interpretationCode code="${result.interpretation}" codeSystem="2.16.840.1.113883.5.83"/>
            <referenceRange>
              <observationRange>
                <value xsi:type="IVL_PQ">
                  <low value="${result.low}" unit="${result.unit}"/>
                  <high value="${result.high}" unit="${result.unit}"/>
                </value>
              </observationRange>
            </referenceRange>
          </observation>
        </component>`;
    })
    .join('');

  const resultText = results
    .map((r, i) => {
      const flag = r.isAbnormal ? (r.interpretation === 'H' ? ' (H)' : ' (L)') : '';
      return `<tr><td>${i + 1}</td><td>${escapeXml(r.display)}</td><td>${r.value}${flag}</td><td>${r.unit}</td><td>${r.low}-${r.high}</td></tr>`;
    })
    .join('');

  return `
  <component>
    <section>
      <templateId root="${TEMPLATE_OIDS.Results}"/>
      <code code="30954-2" codeSystem="2.16.840.1.113883.6.1" displayName="Results"/>
      <title>Results</title>
      <text>
        <table border="1" width="100%">
          <thead><tr><th>#</th><th>Test</th><th>Value</th><th>Unit</th><th>Reference</th></tr></thead>
          <tbody>${resultText}</tbody>
        </table>
      </text>
      <entry typeCode="DRIV">
        <organizer classCode="BATTERY" moodCode="EVN">
          <templateId root="2.16.840.1.113883.10.20.22.4.1"/>
          <id root="${generateUUID()}"/>
          <code code="24323-8" codeSystem="2.16.840.1.113883.6.1" displayName="Comprehensive Metabolic Panel"/>
          <statusCode code="completed"/>
          <effectiveTime value="${formatCcdaDateTime(new Date())}"/>
          ${resultEntries}
        </organizer>
      </entry>
    </section>
  </component>`;
}

function buildVitalSignsSection(vitals: ReturnType<typeof generateVitalSign>[]): string {
  if (vitals.length === 0) {
    return `
  <component>
    <section nullFlavor="NI">
      <templateId root="${TEMPLATE_OIDS.VitalSigns}"/>
      <code code="8716-3" codeSystem="2.16.840.1.113883.6.1" displayName="Vital Signs"/>
      <title>Vital Signs</title>
      <text>No vital signs recorded</text>
    </section>
  </component>`;
  }

  const vitalEntries = vitals
    .map((vital) => {
      return `
        <component>
          <observation classCode="OBS" moodCode="EVN">
            <templateId root="2.16.840.1.113883.10.20.22.4.27"/>
            <id root="${generateUUID()}"/>
            <code code="${vital.code}" codeSystem="2.16.840.1.113883.6.1" displayName="${escapeXml(vital.display)}"/>
            <statusCode code="completed"/>
            <effectiveTime value="${formatCcdaDateTime(new Date())}"/>
            <value xsi:type="PQ" value="${vital.value}" unit="${vital.unit}"/>
          </observation>
        </component>`;
    })
    .join('');

  const vitalText = vitals
    .map((v, i) => `<tr><td>${i + 1}</td><td>${escapeXml(v.display)}</td><td>${v.value}</td><td>${v.unit}</td></tr>`)
    .join('');

  return `
  <component>
    <section>
      <templateId root="${TEMPLATE_OIDS.VitalSigns}"/>
      <code code="8716-3" codeSystem="2.16.840.1.113883.6.1" displayName="Vital Signs"/>
      <title>Vital Signs</title>
      <text>
        <table border="1" width="100%">
          <thead><tr><th>#</th><th>Vital Sign</th><th>Value</th><th>Unit</th></tr></thead>
          <tbody>${vitalText}</tbody>
        </table>
      </text>
      <entry typeCode="DRIV">
        <organizer classCode="CLUSTER" moodCode="EVN">
          <templateId root="2.16.840.1.113883.10.20.22.4.26"/>
          <id root="${generateUUID()}"/>
          <code code="46680005" codeSystem="2.16.840.1.113883.6.96" displayName="Vital Signs"/>
          <statusCode code="completed"/>
          <effectiveTime value="${formatCcdaDateTime(new Date())}"/>
          ${vitalEntries}
        </organizer>
      </entry>
    </section>
  </component>`;
}

function buildFooter(): string {
  return `
</ClinicalDocument>`;
}

/**
 * Generate a Continuity of Care Document (CCD)
 */
export function generateCCD(ehrPrefix: string = 'ATH-'): CCDADocument {
  const documentId = generateUUID();
  const patient = generatePatientData(ehrPrefix);
  const provider = generateProvider();
  const facility = generateFacility();
  const effectiveTime = new Date();

  // Generate random clinical data
  const numAllergies = faker.number.int({ min: 0, max: 3 });
  const numMedications = faker.number.int({ min: 0, max: 5 });
  const numProblems = faker.number.int({ min: 1, max: 4 });
  const numResults = faker.number.int({ min: 3, max: 8 });
  const numVitals = faker.number.int({ min: 4, max: 8 });

  const allergies = Array.from({ length: numAllergies }, () => generateAllergy());
  const medications = Array.from({ length: numMedications }, () => generateMedication());
  const problems = Array.from({ length: numProblems }, () => generateDiagnosis());
  const results = Array.from({ length: numResults }, () => generateLabTest());
  const vitals = Array.from({ length: numVitals }, () => generateVitalSign());

  const xml = [
    buildHeader(documentId, TEMPLATE_OIDS.CCD, 'Continuity of Care Document', patient, provider, facility, effectiveTime),
    '  <component>',
    '    <structuredBody>',
    buildAllergiesSection(allergies),
    buildMedicationsSection(medications),
    buildProblemsSection(problems),
    buildResultsSection(results),
    buildVitalSignsSection(vitals),
    '    </structuredBody>',
    '  </component>',
    buildFooter(),
  ].join('\n');

  return {
    documentId,
    templateType: 'CCD',
    xml,
    parsed: {
      patientData: patient,
      createdAt: effectiveTime,
    },
  };
}

/**
 * Generate a Discharge Summary document
 */
export function generateDischargeSummary(ehrPrefix: string = 'ATH-'): CCDADocument {
  const documentId = generateUUID();
  const patient = generatePatientData(ehrPrefix);
  const encounter = generateEncounterData(patient.id);
  const provider = generateProvider();
  const facility = generateFacility();
  const effectiveTime = new Date();

  const allergies = Array.from({ length: faker.number.int({ min: 0, max: 2 }) }, () => generateAllergy());
  const medications = Array.from({ length: faker.number.int({ min: 2, max: 6 }) }, () => generateMedication());
  const problems = Array.from({ length: faker.number.int({ min: 1, max: 3 }) }, () => generateDiagnosis());

  const xml = [
    buildHeader(documentId, TEMPLATE_OIDS.DischargeSum, 'Discharge Summary', patient, provider, facility, effectiveTime),
    '  <component>',
    '    <structuredBody>',
    buildAllergiesSection(allergies),
    buildMedicationsSection(medications),
    buildProblemsSection(problems),
    `
  <component>
    <section>
      <templateId root="2.16.840.1.113883.10.20.22.2.24"/>
      <code code="11535-2" codeSystem="2.16.840.1.113883.6.1" displayName="Hospital Discharge Diagnosis"/>
      <title>Discharge Diagnosis</title>
      <text>
        <paragraph>${escapeXml(encounter.reason)}</paragraph>
        ${encounter.diagnosis ? `<paragraph>Primary: ${escapeXml(encounter.diagnosis.display)} (${encounter.diagnosis.code})</paragraph>` : ''}
      </text>
    </section>
  </component>`,
    `
  <component>
    <section>
      <templateId root="2.16.840.1.113883.10.20.22.2.41"/>
      <code code="8653-8" codeSystem="2.16.840.1.113883.6.1" displayName="Discharge Instructions"/>
      <title>Discharge Instructions</title>
      <text>
        <list>
          <item>Follow up with ${escapeXml(provider.firstName)} ${escapeXml(provider.lastName)}, MD in 1-2 weeks</item>
          <item>Take medications as prescribed</item>
          <item>Return to Emergency Department if symptoms worsen</item>
          <item>Rest and stay hydrated</item>
        </list>
      </text>
    </section>
  </component>`,
    '    </structuredBody>',
    '  </component>',
    buildFooter(),
  ].join('\n');

  return {
    documentId,
    templateType: 'DischargeSum',
    xml,
    parsed: {
      patientData: patient,
      encounterData: encounter,
      createdAt: effectiveTime,
    },
  };
}

/**
 * Generate a Progress Note document
 */
export function generateProgressNote(ehrPrefix: string = 'ATH-'): CCDADocument {
  const documentId = generateUUID();
  const patient = generatePatientData(ehrPrefix);
  const encounter = generateEncounterData(patient.id);
  const provider = generateProvider();
  const facility = generateFacility();
  const effectiveTime = new Date();

  const vitals = Array.from({ length: faker.number.int({ min: 4, max: 6 }) }, () => generateVitalSign());
  const problems = Array.from({ length: faker.number.int({ min: 1, max: 2 }) }, () => generateDiagnosis());

  const xml = [
    buildHeader(documentId, TEMPLATE_OIDS.ProgressNote, 'Progress Note', patient, provider, facility, effectiveTime),
    '  <component>',
    '    <structuredBody>',
    buildVitalSignsSection(vitals),
    buildProblemsSection(problems),
    `
  <component>
    <section>
      <templateId root="2.16.840.1.113883.10.20.22.2.10"/>
      <code code="18776-5" codeSystem="2.16.840.1.113883.6.1" displayName="Plan of Treatment"/>
      <title>Assessment and Plan</title>
      <text>
        <paragraph><content styleCode="Bold">Chief Complaint:</content> ${escapeXml(encounter.reason)}</paragraph>
        <paragraph><content styleCode="Bold">Assessment:</content> Patient presents with ${escapeXml(encounter.reason.toLowerCase())}. ${problems.length > 0 ? `History of ${problems.map(p => p.display.toLowerCase()).join(', ')}.` : 'No significant medical history.'}</paragraph>
        <paragraph><content styleCode="Bold">Plan:</content></paragraph>
        <list>
          <item>Continue current treatment regimen</item>
          <item>Follow up in ${faker.helpers.arrayElement(['2 weeks', '1 month', '3 months'])}</item>
          ${problems.length > 0 ? `<item>Monitor ${problems[0].display.toLowerCase()}</item>` : ''}
        </list>
      </text>
    </section>
  </component>`,
    '    </structuredBody>',
    '  </component>',
    buildFooter(),
  ].join('\n');

  return {
    documentId,
    templateType: 'ProgressNote',
    xml,
    parsed: {
      patientData: patient,
      encounterData: encounter,
      createdAt: effectiveTime,
    },
  };
}

/**
 * Generate multiple C-CDA documents of random types
 */
export function generateCCDADocuments(count: number = 10, ehrPrefix: string = 'ATH-'): CCDADocument[] {
  const documents: CCDADocument[] = [];

  for (let i = 0; i < count; i++) {
    const docType = faker.helpers.arrayElement(['CCD', 'DischargeSum', 'ProgressNote']);

    switch (docType) {
      case 'CCD':
        documents.push(generateCCD(ehrPrefix));
        break;
      case 'DischargeSum':
        documents.push(generateDischargeSummary(ehrPrefix));
        break;
      case 'ProgressNote':
        documents.push(generateProgressNote(ehrPrefix));
        break;
    }
  }

  return documents;
}
