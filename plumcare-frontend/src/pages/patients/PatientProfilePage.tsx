import {
  ActionIcon,
  Avatar,
  Badge,
  Box,
  Card,
  Divider,
  Grid,
  Group,
  Loader,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import type { Encounter, Observation, Patient, ServiceRequest } from '@medplum/fhirtypes';
import { formatDate, formatHumanName } from '@medplum/core';
import { useMedplum } from '@medplum/react';
import {
  IconActivity,
  IconArrowLeft,
  IconCalendar,
  IconFlask,
  IconGenderFemale,
  IconGenderMale,
  IconHeart,
  IconId,
  IconMail,
  IconMapPin,
  IconPhone,
  IconStethoscope,
  IconUser,
} from '@tabler/icons-react';
import type { JSX } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { type EhrSystem, ehrSystemMeta } from '../../services/ehrApi';
import classes from './PatientProfilePage.module.css';

const EHR_SOURCE_SYSTEM = 'http://plumcare.io/ehr-source';

function getEhrSource(patient: Patient): EhrSystem {
  const tag = patient.meta?.tag?.find((t) => t.system === EHR_SOURCE_SYSTEM);
  if (tag?.code && ['athena', 'elation', 'nextgen'].includes(tag.code)) {
    return tag.code as EhrSystem;
  }
  return 'medplum';
}

function getAgeFromBirthDate(birthDate?: string): string {
  if (!birthDate) return 'Unknown';
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return `${age}`;
}

function getPatientInitials(patient: Patient): string {
  const name = patient.name?.[0];
  const first = name?.given?.[0]?.[0] || '';
  const last = name?.family?.[0] || '';
  return `${first}${last}`.toUpperCase();
}

function getPatientName(patient: Patient): string {
  const name = patient.name?.[0];
  return name ? formatHumanName(name) : 'Unknown Patient';
}

export function PatientProfilePage(): JSX.Element {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const medplum = useMedplum();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [labs, setLabs] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string | null>('overview');

  const fetchPatientData = useCallback(async () => {
    if (!patientId) return;

    try {
      setLoading(true);

      // Fetch patient
      const patientData = await medplum.readResource('Patient', patientId);
      setPatient(patientData);

      // Fetch observations
      const observationsData = await medplum.searchResources('Observation', {
        patient: patientId,
        _count: '50',
        _sort: '-_lastUpdated',
      });
      setObservations(observationsData);

      // Fetch encounters
      const encountersData = await medplum.searchResources('Encounter', {
        patient: patientId,
        _count: '50',
        _sort: '-_lastUpdated',
      });
      setEncounters(encountersData);

      // Fetch labs (ServiceRequests)
      const labsData = await medplum.searchResources('ServiceRequest', {
        subject: `Patient/${patientId}`,
        _count: '50',
        _sort: '-_lastUpdated',
      });
      setLabs(labsData);
    } catch (error) {
      console.error('Error fetching patient data:', error);
    } finally {
      setLoading(false);
    }
  }, [medplum, patientId]);

  useEffect(() => {
    fetchPatientData();
  }, [fetchPatientData]);

  if (loading) {
    return (
      <Box className={classes.loadingContainer}>
        <Loader size="lg" color="orange" />
        <Text c="dimmed" mt="md">
          Loading patient information...
        </Text>
      </Box>
    );
  }

  if (!patient) {
    return (
      <Box className={classes.emptyContainer}>
        <ThemeIcon size={64} radius="xl" variant="light" color="gray">
          <IconUser size={32} />
        </ThemeIcon>
        <Text c="dimmed" mt="md">
          Patient not found
        </Text>
      </Box>
    );
  }

  const ehrSource = getEhrSource(patient);
  const ehrMeta = ehrSystemMeta[ehrSource];

  return (
    <Box>
      <Stack gap="lg">
        {/* Back button and header */}
        <Group>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="lg"
            onClick={() => navigate('/patients')}
            className={classes.backButton}
          >
            <IconArrowLeft size={20} />
          </ActionIcon>
          <Text c="dimmed" size="sm">
            Back to Patients
          </Text>
        </Group>

        {/* Patient Header Card */}
        <Paper p="xl" radius="md" withBorder className={classes.headerCard}>
          <Group justify="space-between" align="flex-start">
            <Group gap="lg">
              <Avatar size={80} radius="xl" color="plumcare" className={classes.avatar}>
                {getPatientInitials(patient)}
              </Avatar>
              <div>
                <Group gap="sm" mb={4}>
                  <Title order={2} className={classes.patientName}>
                    {getPatientName(patient)}
                  </Title>
                  <Tooltip label={ehrMeta.name}>
                    <Badge
                      variant="outline"
                      size="md"
                      style={{ borderColor: ehrMeta.color, color: ehrMeta.color }}
                    >
                      {ehrSource.charAt(0).toUpperCase() + ehrSource.slice(1)}
                    </Badge>
                  </Tooltip>
                </Group>
                <Group gap="md" mt="xs">
                  <Group gap={4}>
                    {patient.gender === 'male' ? (
                      <IconGenderMale size={16} color="#228be6" />
                    ) : (
                      <IconGenderFemale size={16} color="#e64980" />
                    )}
                    <Text size="sm" c="dimmed">
                      {patient.gender?.charAt(0).toUpperCase()}
                      {patient.gender?.slice(1)}
                    </Text>
                  </Group>
                  <Group gap={4}>
                    <IconCalendar size={16} color="#868e96" />
                    <Text size="sm" c="dimmed">
                      {getAgeFromBirthDate(patient.birthDate)} years old
                    </Text>
                  </Group>
                  {patient.birthDate && (
                    <Group gap={4}>
                      <IconHeart size={16} color="#868e96" />
                      <Text size="sm" c="dimmed">
                        DOB: {formatDate(patient.birthDate)}
                      </Text>
                    </Group>
                  )}
                </Group>
              </div>
            </Group>

            {/* Quick Stats */}
            <Group gap="xl">
              <div className={classes.stat}>
                <Text size="xl" fw={700} c="orange">
                  {encounters.length}
                </Text>
                <Text size="xs" c="dimmed">
                  Encounters
                </Text>
              </div>
              <div className={classes.stat}>
                <Text size="xl" fw={700} c="blue">
                  {observations.length}
                </Text>
                <Text size="xs" c="dimmed">
                  Observations
                </Text>
              </div>
              <div className={classes.stat}>
                <Text size="xl" fw={700} c="teal">
                  {labs.length}
                </Text>
                <Text size="xs" c="dimmed">
                  Lab Orders
                </Text>
              </div>
            </Group>
          </Group>
        </Paper>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab} classNames={{ tab: classes.tab }}>
          <Tabs.List>
            <Tabs.Tab value="overview" leftSection={<IconUser size={16} />}>
              Overview
            </Tabs.Tab>
            <Tabs.Tab value="observations" leftSection={<IconActivity size={16} />}>
              Observations ({observations.length})
            </Tabs.Tab>
            <Tabs.Tab value="encounters" leftSection={<IconStethoscope size={16} />}>
              Encounters ({encounters.length})
            </Tabs.Tab>
            <Tabs.Tab value="labs" leftSection={<IconFlask size={16} />}>
              Labs ({labs.length})
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="overview" pt="lg">
            <OverviewTab patient={patient} />
          </Tabs.Panel>

          <Tabs.Panel value="observations" pt="lg">
            <ObservationsTab observations={observations} />
          </Tabs.Panel>

          <Tabs.Panel value="encounters" pt="lg">
            <EncountersTab encounters={encounters} patientId={patientId!} />
          </Tabs.Panel>

          <Tabs.Panel value="labs" pt="lg">
            <LabsTab labs={labs} patientId={patientId!} />
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </Box>
  );
}

// Overview Tab Component
function OverviewTab({ patient }: { patient: Patient }): JSX.Element {
  const address = patient.address?.[0];
  const phone = patient.telecom?.find((t) => t.system === 'phone');
  const email = patient.telecom?.find((t) => t.system === 'email');

  return (
    <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
      {/* Contact Information */}
      <Card withBorder radius="md" className={classes.infoCard}>
        <Title order={4} mb="md">
          Contact Information
        </Title>
        <Stack gap="md">
          {phone && (
            <Group gap="sm">
              <ThemeIcon variant="light" color="orange" size="md">
                <IconPhone size={16} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  Phone
                </Text>
                <Text size="sm" fw={500}>
                  {phone.value}
                </Text>
              </div>
            </Group>
          )}
          {email && (
            <Group gap="sm">
              <ThemeIcon variant="light" color="blue" size="md">
                <IconMail size={16} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  Email
                </Text>
                <Text size="sm" fw={500}>
                  {email.value}
                </Text>
              </div>
            </Group>
          )}
          {address && (
            <Group gap="sm" align="flex-start">
              <ThemeIcon variant="light" color="teal" size="md">
                <IconMapPin size={16} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  Address
                </Text>
                <Text size="sm" fw={500}>
                  {address.line?.join(', ')}
                </Text>
                <Text size="sm" fw={500}>
                  {address.city}, {address.state} {address.postalCode}
                </Text>
              </div>
            </Group>
          )}
          {!phone && !email && !address && (
            <Text c="dimmed" size="sm">
              No contact information available
            </Text>
          )}
        </Stack>
      </Card>

      {/* Identifiers */}
      <Card withBorder radius="md" className={classes.infoCard}>
        <Title order={4} mb="md">
          Identifiers
        </Title>
        <Stack gap="md">
          {patient.identifier?.map((id, index) => (
            <Group key={index} gap="sm">
              <ThemeIcon variant="light" color="gray" size="md">
                <IconId size={16} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed">
                  {id.system?.split('/').pop() || 'ID'}
                </Text>
                <Text size="sm" fw={500}>
                  {id.value}
                </Text>
              </div>
            </Group>
          ))}
          {(!patient.identifier || patient.identifier.length === 0) && (
            <Text c="dimmed" size="sm">
              No identifiers available
            </Text>
          )}
        </Stack>
      </Card>
    </SimpleGrid>
  );
}

// Observations Tab Component
function ObservationsTab({ observations }: { observations: Observation[] }): JSX.Element {
  if (observations.length === 0) {
    return (
      <Paper p="xl" radius="md" withBorder className={classes.emptyState}>
        <Stack align="center" gap="md">
          <ThemeIcon size={48} radius="xl" variant="light" color="gray">
            <IconActivity size={24} />
          </ThemeIcon>
          <Text c="dimmed">No observations recorded</Text>
        </Stack>
      </Paper>
    );
  }

  // Group observations by category
  const vitalSigns = observations.filter((o) =>
    o.category?.some((c) => c.coding?.some((coding) => coding.code === 'vital-signs'))
  );
  const otherObservations = observations.filter(
    (o) => !o.category?.some((c) => c.coding?.some((coding) => coding.code === 'vital-signs'))
  );

  return (
    <Stack gap="lg">
      {/* Vital Signs */}
      {vitalSigns.length > 0 && (
        <Card withBorder radius="md" className={classes.infoCard}>
          <Title order={4} mb="md">
            Vital Signs
          </Title>
          <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
            {vitalSigns.slice(0, 8).map((obs) => (
              <Paper key={obs.id} p="md" radius="md" className={classes.vitalCard}>
                <Text size="xs" c="dimmed" mb={4}>
                  {obs.code?.text || obs.code?.coding?.[0]?.display || 'Unknown'}
                </Text>
                <Text size="lg" fw={700}>
                  {obs.valueQuantity?.value ?? obs.valueString ?? '-'}
                  {obs.valueQuantity?.unit && (
                    <Text span size="sm" fw={400} c="dimmed" ml={4}>
                      {obs.valueQuantity.unit}
                    </Text>
                  )}
                </Text>
                <Text size="xs" c="dimmed" mt={4}>
                  {formatDate(obs.effectiveDateTime || obs.meta?.lastUpdated)}
                </Text>
              </Paper>
            ))}
          </SimpleGrid>
        </Card>
      )}

      {/* All Observations Table */}
      <Card withBorder radius="md" className={classes.infoCard}>
        <Title order={4} mb="md">
          All Observations ({observations.length})
        </Title>
        <ScrollArea h={400}>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Type</Table.Th>
                <Table.Th>Value</Table.Th>
                <Table.Th>Date</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {observations.map((obs) => (
                <Table.Tr key={obs.id}>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {obs.code?.text || obs.code?.coding?.[0]?.display || 'Unknown'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">
                      {obs.valueQuantity?.value ?? obs.valueString ?? obs.valueCodeableConcept?.text ?? '-'}
                      {obs.valueQuantity?.unit && ` ${obs.valueQuantity.unit}`}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {formatDate(obs.effectiveDateTime || obs.meta?.lastUpdated)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Badge size="sm" variant="light" color={obs.status === 'final' ? 'green' : 'gray'}>
                      {obs.status}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Card>
    </Stack>
  );
}

// Encounters Tab Component
function EncountersTab({
  encounters,
  patientId,
}: {
  encounters: Encounter[];
  patientId: string;
}): JSX.Element {
  const navigate = useNavigate();

  if (encounters.length === 0) {
    return (
      <Paper p="xl" radius="md" withBorder className={classes.emptyState}>
        <Stack align="center" gap="md">
          <ThemeIcon size={48} radius="xl" variant="light" color="gray">
            <IconStethoscope size={24} />
          </ThemeIcon>
          <Text c="dimmed">No encounters recorded</Text>
        </Stack>
      </Paper>
    );
  }

  const getEncounterStatusColor = (status?: string): string => {
    switch (status) {
      case 'finished':
        return 'green';
      case 'in-progress':
        return 'blue';
      case 'planned':
        return 'yellow';
      case 'cancelled':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <Card withBorder radius="md" className={classes.infoCard}>
      <ScrollArea h={500}>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Type</Table.Th>
              <Table.Th>Reason</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {encounters.map((encounter) => (
              <Table.Tr
                key={encounter.id}
                className={classes.clickableRow}
                onClick={() => navigate(`/Patient/${patientId}/Encounter/${encounter.id}`)}
              >
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {encounter.type?.[0]?.text ||
                      encounter.type?.[0]?.coding?.[0]?.display ||
                      encounter.class?.display ||
                      'Visit'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm">
                    {encounter.reasonCode?.[0]?.text ||
                      encounter.reasonCode?.[0]?.coding?.[0]?.display ||
                      '-'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {formatDate(encounter.period?.start || encounter.meta?.lastUpdated)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge size="sm" variant="light" color={getEncounterStatusColor(encounter.status)}>
                    {encounter.status}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Card>
  );
}

// Labs Tab Component
function LabsTab({ labs, patientId }: { labs: ServiceRequest[]; patientId: string }): JSX.Element {
  const navigate = useNavigate();

  if (labs.length === 0) {
    return (
      <Paper p="xl" radius="md" withBorder className={classes.emptyState}>
        <Stack align="center" gap="md">
          <ThemeIcon size={48} radius="xl" variant="light" color="gray">
            <IconFlask size={24} />
          </ThemeIcon>
          <Text c="dimmed">No lab orders recorded</Text>
        </Stack>
      </Paper>
    );
  }

  const getLabStatusColor = (status?: string): string => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'active':
        return 'blue';
      case 'draft':
      case 'requested':
        return 'yellow';
      case 'cancelled':
      case 'revoked':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <Card withBorder radius="md" className={classes.infoCard}>
      <ScrollArea h={500}>
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Test</Table.Th>
              <Table.Th>REQ #</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {labs.map((lab) => (
              <Table.Tr
                key={lab.id}
                className={classes.clickableRow}
                onClick={() => navigate(`/Patient/${patientId}/ServiceRequest/${lab.id}`)}
              >
                <Table.Td>
                  <Text size="sm" fw={500}>
                    {lab.code?.text || lab.code?.coding?.[0]?.display || 'Lab Order'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {lab.requisition?.value || '-'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text size="sm" c="dimmed">
                    {formatDate(lab.authoredOn || lab.meta?.lastUpdated)}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Badge size="sm" variant="light" color={getLabStatusColor(lab.status)}>
                    {lab.status}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Card>
  );
}
