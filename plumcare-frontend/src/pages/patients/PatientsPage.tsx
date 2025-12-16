import {
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Loader,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import type { Patient } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import {
  IconChevronRight,
  IconFilter,
  IconSearch,
  IconUser,
  IconUserPlus,
} from '@tabler/icons-react';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { getPatientsByEhr, type EhrSystem, ehrSystemMeta } from '../../services/ehrApi';
import classes from './PatientsPage.module.css';

type PatientWithSource = Patient & { source: EhrSystem };

export function PatientsPage(): JSX.Element {
  const medplum = useMedplum();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [ehrPatients, setEhrPatients] = useState<PatientWithSource[]>([]);
  const [medplumPatients, setMedplumPatients] = useState<PatientWithSource[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch patients from all EHR systems and Medplum
  useEffect(() => {
    const fetchAllPatients = async () => {
      try {
        // Fetch from EHR backend API in parallel
        const [athenaRes, elationRes, nextgenRes] = await Promise.all([
          getPatientsByEhr('athena', { limit: 100 }),
          getPatientsByEhr('elation', { limit: 100 }),
          getPatientsByEhr('nextgen', { limit: 100 }),
        ]);

        const ehrPatientsWithSource: PatientWithSource[] = [
          ...athenaRes.data.map(p => ({ ...p, source: 'athena' as EhrSystem })),
          ...elationRes.data.map(p => ({ ...p, source: 'elation' as EhrSystem })),
          ...nextgenRes.data.map(p => ({ ...p, source: 'nextgen' as EhrSystem })),
        ];
        setEhrPatients(ehrPatientsWithSource);

        // Also fetch from Medplum
        const patients = await medplum.searchResources('Patient', { _count: '100' });
        const patientsWithSource = patients.map(p => ({ ...p, source: 'medplum' as EhrSystem }));
        setMedplumPatients(patientsWithSource);
      } catch (error) {
        console.error('Error fetching patients:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllPatients();
  }, [medplum]);

  // Combine EHR patients with Medplum patients
  const allPatients: PatientWithSource[] = [...ehrPatients, ...medplumPatients];

  const filteredPatients = allPatients.filter(patient => {
    const name = patient.name?.[0];
    const fullName = `${name?.given?.join(' ')} ${name?.family}`.toLowerCase();
    const matchesSearch = !searchQuery || fullName.includes(searchQuery.toLowerCase());
    const matchesSource = !sourceFilter || patient.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  const getPatientInitials = (patient: typeof allPatients[0]) => {
    const name = patient.name?.[0];
    const first = name?.given?.[0]?.[0] || '';
    const last = name?.family?.[0] || '';
    return `${first}${last}`.toUpperCase();
  };

  const getPatientName = (patient: typeof allPatients[0]) => {
    const name = patient.name?.[0];
    return `${name?.given?.join(' ')} ${name?.family}`;
  };

  const getAgeFromBirthDate = (birthDate?: string) => {
    if (!birthDate) return 'Unknown';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return `${age} years`;
  };

  return (
    <Box>
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <div>
            <Title order={1} className={classes.pageTitle}>
              Patients
            </Title>
            <Group gap="xs">
              <Text c="dimmed" size="sm">
                {filteredPatients.length} patients from {sourceFilter ? ehrSystemMeta[sourceFilter as EhrSystem].name : 'all sources'}
              </Text>
              {loading && <Loader size="xs" />}
            </Group>
          </div>
          <Button
            leftSection={<IconUserPlus size={18} />}
            onClick={() => navigate('/new-patient')}
            className={classes.addButton}
          >
            New Patient
          </Button>
        </Group>

        {/* Filters */}
        <Paper p="md" radius="md" withBorder className={classes.filterCard}>
          <Group>
            <TextInput
              placeholder="Search patients..."
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="Filter by source"
              leftSection={<IconFilter size={16} />}
              data={[
                { value: 'athena', label: 'Athena Health' },
                { value: 'elation', label: 'Elation Health' },
                { value: 'nextgen', label: 'NextGen Healthcare' },
                { value: 'medplum', label: 'Medplum' },
              ]}
              value={sourceFilter}
              onChange={setSourceFilter}
              clearable
              w={200}
            />
          </Group>
        </Paper>

        {/* Stats Cards */}
        <SimpleGrid cols={{ base: 1, sm: 4 }}>
          {(['athena', 'elation', 'nextgen', 'medplum'] as EhrSystem[]).map((system) => {
            const count = allPatients.filter(p => p.source === system).length;
            const meta = ehrSystemMeta[system];
            return (
              <Paper
                key={system}
                p="md"
                radius="md"
                withBorder
                className={classes.statCard}
                style={{ borderLeftColor: meta.color, borderLeftWidth: 3 }}
              >
                <Group justify="space-between">
                  <div>
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                      {meta.name}
                    </Text>
                    <Text fw={700} size="xl">
                      {count}
                    </Text>
                  </div>
                  <Avatar size={40} radius="md" style={{ backgroundColor: meta.color + '15' }}>
                    <Text fw={700} size="sm" c={meta.color}>
                      {system.charAt(0).toUpperCase()}
                    </Text>
                  </Avatar>
                </Group>
              </Paper>
            );
          })}
        </SimpleGrid>

        {/* Patients Table */}
        <Paper p="md" radius="md" withBorder>
          <Table highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Patient</Table.Th>
                <Table.Th>Age</Table.Th>
                <Table.Th>Gender</Table.Th>
                <Table.Th>Location</Table.Th>
                <Table.Th>Source</Table.Th>
                <Table.Th></Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {filteredPatients.map((patient) => {
                const meta = ehrSystemMeta[patient.source];
                return (
                  <Table.Tr
                    key={patient.id}
                    className={classes.patientRow}
                    onClick={() => navigate(`/patients/${patient.id}`)}
                  >
                    <Table.Td>
                      <Group gap="sm">
                        <Avatar size={36} radius="xl" color="plumcare">
                          {getPatientInitials(patient)}
                        </Avatar>
                        <div>
                          <Text fw={500} size="sm">
                            {getPatientName(patient)}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {patient.identifier?.[0]?.value}
                          </Text>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{getAgeFromBirthDate(patient.birthDate)}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={patient.gender === 'male' ? 'blue' : 'pink'}
                        size="sm"
                      >
                        {patient.gender}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">
                        {patient.address?.[0]?.city}, {patient.address?.[0]?.state}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Tooltip label={meta.name}>
                        <Badge
                          variant="outline"
                          size="sm"
                          style={{ borderColor: meta.color, color: meta.color }}
                        >
                          {patient.source.charAt(0).toUpperCase() + patient.source.slice(1)}
                        </Badge>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td>
                      <ThemeIcon variant="subtle" color="gray" size="sm">
                        <IconChevronRight size={16} />
                      </ThemeIcon>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Table.Tbody>
          </Table>

          {filteredPatients.length === 0 && (
            <Box py="xl" ta="center">
              <ThemeIcon size={48} radius="xl" variant="light" color="gray" mx="auto" mb="md">
                <IconUser size={24} />
              </ThemeIcon>
              <Text c="dimmed">No patients found</Text>
            </Box>
          )}
        </Paper>
      </Stack>
    </Box>
  );
}
