import {
  Badge,
  Box,
  Card,
  Center,
  Flex,
  Grid,
  Group,
  Loader,
  Paper,
  Progress,
  RingProgress,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconActivity,
  IconAlertCircle,
  IconCheck,
  IconCloudUpload,
  IconDatabase,
  IconLoader,
  IconPlugConnected,
  IconRefresh,
  IconUsers,
} from '@tabler/icons-react';
import type { JSX } from 'react';
import { useState, useEffect } from 'react';
import {
  getEhrConnections,
  getSyncEvents,
  ehrSystemMeta,
  type EhrConnection,
  type SyncEvent,
} from '../../services/ehrApi';
import { EhrConnectionCard } from '../../components/ehr/EhrConnectionCard';
import { SyncActivityFeed } from '../../components/ehr/SyncActivityFeed';
import classes from './EhrIntegrationsPage.module.css';

export function EhrIntegrationsPage(): JSX.Element {
  const [connections, setConnections] = useState<EhrConnection[]>([]);
  const [syncEvents, setSyncEvents] = useState<SyncEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [connectionsData, syncData] = await Promise.all([
          getEhrConnections(),
          getSyncEvents({ limit: 10 }),
        ]);
        setConnections(connectionsData);
        setSyncEvents(syncData.events);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
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

  if (error) {
    return (
      <Center h="50vh">
        <Text c="red">{error}</Text>
      </Center>
    );
  }

  return (
    <Box p="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Title order={1} mb="xs" className={classes.pageTitle}>
            EHR Integrations
          </Title>
          <Text c="dimmed" size="sm">
            Manage FHIR + HL7 integrations with Athena, Elation, and NextGen EHR systems
          </Text>
        </Box>

        {/* Stats Overview */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" withBorder className={classes.statCard}>
              <Group justify="space-between">
                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    Connected Systems
                  </Text>
                  <Text fw={700} size="xl">
                    {stats.connectedSystems}/{stats.totalSystems}
                  </Text>
                </div>
                <ThemeIcon color="teal" variant="light" size="lg" radius="md">
                  <IconPlugConnected size={20} />
                </ThemeIcon>
              </Group>
              <Progress value={(stats.connectedSystems / stats.totalSystems) * 100} mt="md" size="sm" color="teal" />
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" withBorder className={classes.statCard}>
              <Group justify="space-between">
                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    Total Patients
                  </Text>
                  <Text fw={700} size="xl">
                    {stats.totalPatients.toLocaleString()}
                  </Text>
                </div>
                <ThemeIcon color="blue" variant="light" size="lg" radius="md">
                  <IconUsers size={20} />
                </ThemeIcon>
              </Group>
              <Text size="xs" c="dimmed" mt="md">
                Across all connected EHR systems
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" withBorder className={classes.statCard}>
              <Group justify="space-between">
                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    Total Encounters
                  </Text>
                  <Text fw={700} size="xl">
                    {stats.totalEncounters.toLocaleString()}
                  </Text>
                </div>
                <ThemeIcon color="violet" variant="light" size="lg" radius="md">
                  <IconDatabase size={20} />
                </ThemeIcon>
              </Group>
              <Text size="xs" c="dimmed" mt="md">
                Synced from EHR systems
              </Text>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Paper p="md" radius="md" withBorder className={classes.statCard}>
              <Group justify="space-between">
                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    Pending Records
                  </Text>
                  <Text fw={700} size="xl">
                    {stats.totalPending}
                  </Text>
                </div>
                <ThemeIcon color={stats.totalPending > 100 ? 'orange' : 'gray'} variant="light" size="lg" radius="md">
                  <IconCloudUpload size={20} />
                </ThemeIcon>
              </Group>
              <Text size="xs" c="dimmed" mt="md">
                Awaiting synchronization
              </Text>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* EHR Connection Cards */}
        <Box>
          <Title order={2} size="h3" mb="md">
            EHR Connections
          </Title>
          <Grid>
            {connections.map((connection) => (
              <Grid.Col key={connection.id} span={{ base: 12, md: 4 }}>
                <EhrConnectionCard connection={connection} />
              </Grid.Col>
            ))}
          </Grid>
        </Box>

        {/* Sync Activity and FHIR Capabilities */}
        <Grid>
          <Grid.Col span={{ base: 12, lg: 7 }}>
            <Paper p="md" radius="md" withBorder>
              <Group justify="space-between" mb="md">
                <Title order={3} size="h4">
                  Recent Sync Activity
                </Title>
                <Badge variant="light" color="blue" leftSection={<IconActivity size={12} />}>
                  Live
                </Badge>
              </Group>
              <SyncActivityFeed events={syncEvents} />
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, lg: 5 }}>
            <Paper p="md" radius="md" withBorder h="100%">
              <Title order={3} size="h4" mb="md">
                FHIR Resource Support
              </Title>
              <Stack gap="sm">
                {['Patient', 'Encounter', 'Observation', 'Condition', 'DiagnosticReport', 'MedicationRequest'].map(
                  (resource) => {
                    const supportedBy = connections.filter((c) => c.capabilities.includes(resource));
                    return (
                      <Group key={resource} justify="space-between">
                        <Text size="sm">{resource}</Text>
                        <Group gap="xs">
                          {connections.map((conn) => (
                            <Tooltip key={conn.id} label={ehrSystemMeta[conn.system].name}>
                              <Badge
                                size="xs"
                                variant={conn.capabilities.includes(resource) ? 'filled' : 'light'}
                                color={conn.capabilities.includes(resource) ? 'teal' : 'gray'}
                              >
                                {conn.system.charAt(0).toUpperCase()}
                              </Badge>
                            </Tooltip>
                          ))}
                        </Group>
                      </Group>
                    );
                  }
                )}
              </Stack>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Integration Health */}
        <Paper p="md" radius="md" withBorder>
          <Title order={3} size="h4" mb="md">
            Integration Health Overview
          </Title>
          <Grid>
            {connections.map((connection) => {
              const meta = ehrSystemMeta[connection.system];
              const healthScore =
                connection.status === 'connected'
                  ? 100
                  : connection.status === 'syncing'
                    ? 85
                    : connection.status === 'error'
                      ? 30
                      : 0;

              return (
                <Grid.Col key={connection.id} span={{ base: 12, sm: 4 }}>
                  <Card withBorder padding="lg" radius="md">
                    <Flex direction="column" align="center" gap="md">
                      <RingProgress
                        size={100}
                        thickness={10}
                        roundCaps
                        sections={[{ value: healthScore, color: healthScore > 80 ? 'teal' : healthScore > 50 ? 'orange' : 'red' }]}
                        label={
                          <Text ta="center" fw={700} size="lg">
                            {healthScore}%
                          </Text>
                        }
                      />
                      <div style={{ textAlign: 'center' }}>
                        <Text fw={600}>{meta.name}</Text>
                        <Text size="xs" c="dimmed">
                          Last sync: {new Date(connection.lastSync).toLocaleTimeString()}
                        </Text>
                      </div>
                      <Badge
                        color={
                          connection.status === 'connected'
                            ? 'teal'
                            : connection.status === 'syncing'
                              ? 'orange'
                              : connection.status === 'error'
                                ? 'red'
                                : 'gray'
                        }
                        variant="light"
                        leftSection={
                          connection.status === 'connected' ? (
                            <IconCheck size={12} />
                          ) : connection.status === 'syncing' ? (
                            <IconLoader size={12} className={classes.spinning} />
                          ) : connection.status === 'error' ? (
                            <IconAlertCircle size={12} />
                          ) : null
                        }
                      >
                        {connection.status}
                      </Badge>
                    </Flex>
                  </Card>
                </Grid.Col>
              );
            })}
          </Grid>
        </Paper>
      </Stack>
    </Box>
  );
}
