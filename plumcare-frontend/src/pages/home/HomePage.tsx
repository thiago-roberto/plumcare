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
import {
  IconActivity,
  IconArrowRight,
  IconCheck,
  IconCloud,
  IconDatabase,
  IconPlugConnected,
  IconRefresh,
  IconUsers,
} from '@tabler/icons-react';
import type { JSX } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { getEhrConnections, ehrSystemMeta, type EhrConnection } from '../../services/ehrApi';
import classes from './HomePage.module.css';

export function HomePage(): JSX.Element {
  const navigate = useNavigate();
  const [connections, setConnections] = useState<EhrConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEhrConnections()
      .then(setConnections)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Calculate stats from connections
  const stats = {
    connectedSystems: connections.filter(c => c.status === 'connected' || c.status === 'syncing').length,
    totalSystems: connections.length || 3,
    totalPatients: connections.reduce((sum, c) => sum + c.patientCount, 0),
    totalEncounters: connections.reduce((sum, c) => sum + c.encounterCount, 0),
    totalPending: connections.reduce((sum, c) => sum + c.pendingRecords, 0),
  };

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
                    sections={[{ value: (stats.connectedSystems / stats.totalSystems) * 100, color: '#0d9488' }]}
                    label={
                      <Text ta="center" fw={700} size="xl">
                        {stats.connectedSystems}/{stats.totalSystems}
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
                    sections={[{ value: 100, color: '#ff5500' }]}
                    label={
                      <Text ta="center" fw={700} size="xl">
                        {(stats.totalPatients / 1000).toFixed(1)}k
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
                {stats.connectedSystems}
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
                {stats.totalPatients.toLocaleString()}
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
                {stats.totalEncounters.toLocaleString()}
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
              <Text fw={700} size="2rem" className={classes.statValueGreen}>
                Active
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
          >
            Refresh
          </Button>
        </Group>

        <SimpleGrid cols={{ base: 1, md: 3 }}>
          {connections.map((connection) => {
            const meta = ehrSystemMeta[connection.system];
            return (
              <Card
                key={connection.id}
                className={classes.ehrCard}
                padding="lg"
                radius="md"
                withBorder
              >
                <Group justify="space-between" mb="md">
                  <Group gap="sm">
                    <Box
                      className={classes.ehrDot}
                      style={{ backgroundColor: connection.status === 'connected' ? '#0d9488' : connection.status === 'syncing' ? '#ff5500' : '#ef4444' }}
                    />
                    <Text fw={600}>{meta.name}</Text>
                  </Group>
                  <ThemeIcon
                    size={24}
                    radius="xl"
                    color={connection.status === 'connected' ? 'teal' : connection.status === 'syncing' ? 'orange' : 'red'}
                    variant="light"
                  >
                    <IconCheck size={14} />
                  </ThemeIcon>
                </Group>

                <Group gap="xl">
                  <div>
                    <Text size="xs" c="dimmed">Patients</Text>
                    <Text fw={600}>{connection.patientCount.toLocaleString()}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Encounters</Text>
                    <Text fw={600}>{connection.encounterCount.toLocaleString()}</Text>
                  </div>
                  <div>
                    <Text size="xs" c="dimmed">Pending</Text>
                    <Text fw={600} c={connection.pendingRecords > 0 ? 'orange' : 'teal'}>
                      {connection.pendingRecords}
                    </Text>
                  </div>
                </Group>

                <Text size="xs" c="dimmed" mt="md">
                  Last sync: {new Date(connection.lastSync).toLocaleTimeString()}
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
