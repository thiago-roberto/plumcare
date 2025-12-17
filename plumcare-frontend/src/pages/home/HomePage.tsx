import {
  Box,
  Button,
  Card,
  Center,
  Grid,
  Group,
  Loader,
  Paper,
  RingProgress,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import type { Patient, Encounter } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import {
  IconActivity,
  IconArrowRight,
  IconCheck,
  IconDatabase,
  IconPlugConnected,
  IconRefresh,
  IconUsers,
} from '@tabler/icons-react';
import type { JSX } from 'react';
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ehrSystemMeta, type EhrSystem } from '../../services/ehrApi';
import classes from './HomePage.module.css';

const EHR_SOURCE_SYSTEM = 'http://plumcare.io/ehr-source';
const EHR_SYSTEMS: EhrSystem[] = ['athena', 'elation', 'nextgen'];

interface EhrStats {
  system: EhrSystem;
  patientCount: number;
  encounterCount: number;
  status: 'connected' | 'syncing' | 'disconnected';
  lastSync: string;
}

// Get EHR source from resource tags
function getEhrSource(resource: Patient | Encounter): EhrSystem | null {
  const tag = resource.meta?.tag?.find(t => t.system === EHR_SOURCE_SYSTEM);
  if (tag?.code && EHR_SYSTEMS.includes(tag.code as EhrSystem)) {
    return tag.code as EhrSystem;
  }
  return null;
}

export function HomePage(): JSX.Element {
  const navigate = useNavigate();
  const medplum = useMedplum();
  const [ehrStats, setEhrStats] = useState<EhrStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch all patients and encounters from Medplum
      const [patients, encounters] = await Promise.all([
        medplum.searchResources('Patient', { _count: '500' }),
        medplum.searchResources('Encounter', { _count: '500' }),
      ]);

      // Count by EHR source
      const patientCounts: Record<EhrSystem, number> = { athena: 0, elation: 0, nextgen: 0, medplum: 0 };
      const encounterCounts: Record<EhrSystem, number> = { athena: 0, elation: 0, nextgen: 0, medplum: 0 };

      patients.forEach(p => {
        const source = getEhrSource(p);
        if (source) {
          patientCounts[source]++;
        }
      });

      encounters.forEach(e => {
        const source = getEhrSource(e);
        if (source) {
          encounterCounts[source]++;
        }
      });

      // Build stats for each EHR system
      const stats: EhrStats[] = EHR_SYSTEMS.map(system => ({
        system,
        patientCount: patientCounts[system],
        encounterCount: encounterCounts[system],
        status: patientCounts[system] > 0 ? 'connected' : 'disconnected',
        lastSync: new Date().toISOString(),
      }));

      setEhrStats(stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  }, [medplum]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Calculate totals
  const totalPatients = ehrStats.reduce((sum, s) => sum + s.patientCount, 0);
  const totalEncounters = ehrStats.reduce((sum, s) => sum + s.encounterCount, 0);
  const connectedSystems = ehrStats.filter(s => s.status === 'connected').length;

  if (loading) {
    return (
      <Center h="50vh">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <Stack gap="xl">
      {/* Hero Section */}
      <Paper className={classes.hero} p="xl" radius="lg">
        <Grid align="center">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Text className={classes.heroLabel}>
              // ENTERPRISE EHR INTEGRATION PLATFORM
            </Text>
            <Title order={1} className={classes.heroTitle}>
              Unified Patient Data,
              <br />
              <span className={classes.heroHighlight}>Better Outcomes</span>
            </Title>
            <Text className={classes.heroDescription}>
              PlumCare connects your practice to Athena, Elation, and NextGen through
              FHIR R4 and HL7 v2 integrations, keeping patient data synchronized in real-time.
            </Text>
            <Group mt="xl">
              <Button
                size="lg"
                className={classes.heroButton}
                rightSection={<IconArrowRight size={20} />}
                onClick={() => navigate('/ehr-integrations')}
              >
                View Integrations
              </Button>
              <Button
                size="lg"
                variant="outline"
                className={classes.heroButtonOutline}
                onClick={() => navigate('/patients')}
              >
                Browse Patients
              </Button>
            </Group>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Box className={classes.heroStats}>
              <Group justify="center" gap="xl">
                <div className={classes.statCircle}>
                  <RingProgress
                    size={120}
                    thickness={8}
                    roundCaps
                    sections={[{ value: (connectedSystems / 3) * 100, color: '#0d9488' }]}
                    label={
                      <Text ta="center" fw={700} size="xl">
                        {connectedSystems}/3
                      </Text>
                    }
                  />
                  <Text size="sm" c="dimmed" ta="center" mt="xs">Connected</Text>
                </div>
                <div className={classes.statCircle}>
                  <RingProgress
                    size={120}
                    thickness={8}
                    roundCaps
                    sections={[{ value: totalPatients > 0 ? 100 : 0, color: '#ff5500' }]}
                    label={
                      <Text ta="center" fw={700} size="xl">
                        {totalPatients}
                      </Text>
                    }
                  />
                  <Text size="sm" c="dimmed" ta="center" mt="xs">Patients</Text>
                </div>
              </Group>
            </Box>
          </Grid.Col>
        </Grid>
      </Paper>

      {/* Quick Stats */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
        <Card className={classes.statCard} padding="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Connected EHRs
              </Text>
              <Text fw={700} size="2rem" className={classes.statValue}>
                {connectedSystems}
              </Text>
            </div>
            <ThemeIcon size={48} radius="md" className={classes.statIconGreen}>
              <IconPlugConnected size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card className={classes.statCard} padding="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Total Patients
              </Text>
              <Text fw={700} size="2rem" className={classes.statValue}>
                {totalPatients.toLocaleString()}
              </Text>
            </div>
            <ThemeIcon size={48} radius="md" className={classes.statIconBlue}>
              <IconUsers size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card className={classes.statCard} padding="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Total Encounters
              </Text>
              <Text fw={700} size="2rem" className={classes.statValue}>
                {totalEncounters.toLocaleString()}
              </Text>
            </div>
            <ThemeIcon size={48} radius="md" className={classes.statIconPurple}>
              <IconDatabase size={24} />
            </ThemeIcon>
          </Group>
        </Card>

        <Card className={classes.statCard} padding="lg" radius="md" withBorder>
          <Group justify="space-between">
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                Sync Status
              </Text>
              <Text fw={700} size="2rem" className={connectedSystems > 0 ? classes.statValueGreen : classes.statValue}>
                {connectedSystems > 0 ? 'Active' : 'Idle'}
              </Text>
            </div>
            <ThemeIcon size={48} radius="md" className={classes.statIconOrange}>
              <IconActivity size={24} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {/* EHR Connection Status */}
      <Box>
        <Group justify="space-between" mb="md">
          <Title order={2} className={classes.sectionTitle}>
            EHR Connection Status
          </Title>
          <Button
            variant="subtle"
            rightSection={<IconRefresh size={16} />}
            className={classes.refreshButton}
            onClick={fetchStats}
          >
            Refresh
          </Button>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 3 }}>
          {ehrStats.map((stats) => {
            const meta = ehrSystemMeta[stats.system];
            return (
              <Card
                key={stats.system}
                className={classes.ehrCard}
                padding="lg"
                radius="md"
                withBorder
              >
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <Box
                      className={classes.ehrDot}
                      style={{ backgroundColor: stats.status === 'connected' ? '#0d9488' : stats.status === 'syncing' ? '#ff5500' : '#94a3b8' }}
                    />
                    <Text fw={600}>{meta.name}</Text>
                  </Group>
                  <ThemeIcon
                    size={24}
                    radius="xl"
                    color={stats.status === 'connected' ? 'teal' : stats.status === 'syncing' ? 'orange' : 'gray'}
                    variant="light"
                  >
                    <IconCheck size={14} />
                  </ThemeIcon>
                </Group>

                <Group gap="xl">
                  <div>
                    <Text size="xs" c="dimmed">Patients</Text>
                    <Text fw={600}>{stats.patientCount.toLocaleString()}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Encounters</Text>
                    <Text fw={600}>{stats.encounterCount.toLocaleString()}</Text>
                  </div>
                </Group>

                <Text size="xs" c="dimmed" mt="md">
                  {stats.patientCount > 0 ? `${stats.patientCount} patients synced` : 'No data synced yet'}
                </Text>
              </Card>
            );
          })}
        </SimpleGrid>
      </Box>

      {/* Quick Actions */}
      <Paper className={classes.quickActions} p="xl" radius="lg">
        <Group justify="space-between" align="center">
          <div>
            <Text fw={600} size="lg" c="white">Ready to get started?</Text>
            <Text size="sm" c="rgba(255,255,255,0.7)">
              Add a new patient or explore your EHR integrations
            </Text>
          </div>
          <Group>
            <Button
              variant="white"
              color="dark"
              onClick={() => navigate('/new-patient')}
            >
              Add New Patient
            </Button>
            <Button
              variant="outline"
              color="white"
              onClick={() => navigate('/ehr-integrations')}
            >
              View All Integrations
            </Button>
          </Group>
        </Group>
      </Paper>
    </Stack>
  );
}
