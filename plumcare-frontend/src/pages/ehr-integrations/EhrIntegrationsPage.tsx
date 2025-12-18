import {
  Badge,
  Box,
  Button,
  Card,
  Center,
  Flex,
  Grid,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  Progress,
  RingProgress,
  Stack,
  Switch,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import type { Patient, Encounter } from '@medplum/fhirtypes';
import { useMedplum } from '@medplum/react';
import {
  IconActivity,
  IconAlertCircle,
  IconCheck,
  IconCloudUpload,
  IconDatabase,
  IconPlugConnected,
  IconRefresh,
  IconUsers,
} from '@tabler/icons-react';
import type { JSX } from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  syncMockData,
  ehrSystemMeta,
  type EhrSystem,
  type MockDataSyncResponse,
} from '../../services/ehrApi';
import classes from './EhrIntegrationsPage.module.css';

const EHR_SOURCE_SYSTEM = 'http://plumcare.io/ehr-source';
const EHR_SYSTEMS: EhrSystem[] = ['athena', 'elation', 'nextgen'];

interface EhrStats {
  system: EhrSystem;
  patientCount: number;
  encounterCount: number;
  observationCount: number;
  conditionCount: number;
  status: 'connected' | 'disconnected';
}

interface SyncActivity {
  id: string;
  timestamp: string;
  success: boolean;
  totalResources: number;
  summary: {
    athena: { patients: number; encounters: number };
    elation: { patients: number; encounters: number };
    nextgen: { patients: number; encounters: number };
  };
}

// Load sync history from localStorage
function loadSyncHistory(): SyncActivity[] {
  try {
    const stored = localStorage.getItem('plumcare-sync-history');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

// Save sync history to localStorage
function saveSyncHistory(history: SyncActivity[]): void {
  try {
    // Keep only last 10 syncs
    const trimmed = history.slice(0, 10);
    localStorage.setItem('plumcare-sync-history', JSON.stringify(trimmed));
  } catch {
    // Ignore storage errors
  }
}

// Format time ago
function getTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function getEhrSource(resource: Patient | Encounter): EhrSystem | null {
  const tag = resource.meta?.tag?.find(t => t.system === EHR_SOURCE_SYSTEM);
  if (tag?.code && EHR_SYSTEMS.includes(tag.code as EhrSystem)) {
    return tag.code as EhrSystem;
  }
  return null;
}

export function EhrIntegrationsPage(): JSX.Element {
  const medplum = useMedplum();
  const [ehrStats, setEhrStats] = useState<EhrStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock data sync state
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [patientCount, setPatientCount] = useState<number>(3);
  const [includeAllData, setIncludeAllData] = useState(true);
  const [syncResult, setSyncResult] = useState<MockDataSyncResponse | null>(null);
  const [syncHistory, setSyncHistory] = useState<SyncActivity[]>(() => loadSyncHistory());

  const fetchStats = useCallback(async (isRefresh = false) => {
    console.log('fetchStats called, isRefresh:', isRefresh);
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      // Fetch resources from Medplum - use invalidateSearches to bypass cache on refresh
      if (isRefresh) {
        medplum.invalidateSearches('Patient');
        medplum.invalidateSearches('Encounter');
        medplum.invalidateSearches('Observation');
        medplum.invalidateSearches('Condition');
      }

      console.log('Fetching from Medplum...');

      // Query counts per EHR system using tag filters - this avoids the 1000 result cap
      // by getting accurate totals from the server
      const countQueries = EHR_SYSTEMS.flatMap(ehr => [
        medplum.search('Patient', { _tag: `${EHR_SOURCE_SYSTEM}|${ehr}`, _total: 'accurate', _count: '0' }),
        medplum.search('Encounter', { _tag: `${EHR_SOURCE_SYSTEM}|${ehr}`, _total: 'accurate', _count: '0' }),
        medplum.search('Observation', { _tag: `${EHR_SOURCE_SYSTEM}|${ehr}`, _total: 'accurate', _count: '0' }),
        medplum.search('Condition', { _tag: `${EHR_SOURCE_SYSTEM}|${ehr}`, _total: 'accurate', _count: '0' }),
      ]);

      console.log('Query example:', `_tag=${EHR_SOURCE_SYSTEM}|athena`);

      const results = await Promise.all(countQueries);

      console.log('Raw results:', results.map((r, i) => ({ index: i, total: r.total })));

      // Parse results - 4 queries per EHR (patient, encounter, observation, condition)
      const counts: Record<EhrSystem, { patients: number; encounters: number; observations: number; conditions: number }> = {
        athena: { patients: 0, encounters: 0, observations: 0, conditions: 0 },
        elation: { patients: 0, encounters: 0, observations: 0, conditions: 0 },
        nextgen: { patients: 0, encounters: 0, observations: 0, conditions: 0 },
      };

      EHR_SYSTEMS.forEach((ehr, ehrIndex) => {
        const baseIndex = ehrIndex * 4;
        counts[ehr] = {
          patients: results[baseIndex].total || 0,
          encounters: results[baseIndex + 1].total || 0,
          observations: results[baseIndex + 2].total || 0,
          conditions: results[baseIndex + 3].total || 0,
        };
      });

      console.log('Counts by EHR (from server totals):', counts);

      const stats: EhrStats[] = EHR_SYSTEMS.map(system => ({
        system,
        patientCount: counts[system].patients,
        encounterCount: counts[system].encounters,
        observationCount: counts[system].observations,
        conditionCount: counts[system].conditions,
        status: counts[system].patients > 0 ? 'connected' : 'disconnected',
      }));

      setEhrStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [medplum]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Handle mock data sync
  const handleSyncMockData = async () => {
    try {
      setSyncing(true);
      setSyncResult(null);
      const result = await syncMockData({ patientCount, includeAllData });
      setSyncResult(result);

      // Add to sync history
      const activity: SyncActivity = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        success: result.success,
        totalResources: result.totalResources,
        summary: {
          athena: { patients: result.summary.athena.patients, encounters: result.summary.athena.encounters },
          elation: { patients: result.summary.elation.patients, encounters: result.summary.elation.encounters },
          nextgen: { patients: result.summary.nextgen.patients, encounters: result.summary.nextgen.encounters },
        },
      };
      const newHistory = [activity, ...syncHistory];
      setSyncHistory(newHistory);
      saveSyncHistory(newHistory);

      // Refresh stats after sync
      await fetchStats();
    } catch (err) {
      setSyncResult({
        success: false,
        summary: {
          athena: { patients: 0, encounters: 0, observations: 0, conditions: 0, allergies: 0, medications: 0, diagnosticReports: 0 },
          elation: { patients: 0, encounters: 0, observations: 0, conditions: 0, allergies: 0, medications: 0, diagnosticReports: 0 },
          nextgen: { patients: 0, encounters: 0, observations: 0, conditions: 0, allergies: 0, medications: 0, diagnosticReports: 0 },
        },
        totalResources: 0,
        errors: [err instanceof Error ? err.message : 'Failed to sync mock data'],
      });
    } finally {
      setSyncing(false);
    }
  };

  // Calculate totals
  const totalPatients = ehrStats.reduce((sum, s) => sum + s.patientCount, 0);
  const totalEncounters = ehrStats.reduce((sum, s) => sum + s.encounterCount, 0);
  const totalObservations = ehrStats.reduce((sum, s) => sum + s.observationCount, 0);
  const connectedSystems = ehrStats.filter(s => s.status === 'connected').length;

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
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={1} mb="xs" className={classes.pageTitle}>
              EHR Integrations
            </Title>
            <Text c="dimmed" size="sm">
              Manage FHIR + HL7 integrations with Athena, Elation, and NextGen EHR systems
            </Text>
          </Box>
          <Group>
            <Button
              leftSection={<IconRefresh size={16} className={refreshing ? classes.spinning : ''} />}
              variant="subtle"
              onClick={() => fetchStats(true)}
              loading={refreshing}
              loaderProps={{ size: 'xs' }}
            >
              Refresh
            </Button>
            <Button
              leftSection={<IconDatabase size={16} />}
              variant="light"
              color="violet"
              onClick={() => setSyncModalOpen(true)}
            >
              Sync Mock Data
            </Button>
          </Group>
        </Group>

        {/* Mock Data Sync Modal */}
        <Modal
          opened={syncModalOpen}
          onClose={() => {
            setSyncModalOpen(false);
            setSyncResult(null);
          }}
          title="Sync Mock Data"
          size="lg"
        >
          <Stack gap="md">
            {!syncResult ? (
              <>
                <Text size="sm" c="dimmed">
                  Generate random patient data for all 3 EHRs (Athena, Elation, NextGen), transform to FHIR R4, and store in Medplum.
                </Text>

                <NumberInput
                  label="Patients per EHR"
                  description="Number of patients to generate for each EHR system (1-50)"
                  value={patientCount}
                  onChange={(val) => setPatientCount(typeof val === 'number' ? val : 3)}
                  min={1}
                  max={50}
                />

                <Switch
                  label="Include all data"
                  description="Generate encounters, labs, allergies, medications, conditions, etc."
                  checked={includeAllData}
                  onChange={(event) => setIncludeAllData(event.currentTarget.checked)}
                />

                <Button
                  fullWidth
                  loading={syncing}
                  onClick={handleSyncMockData}
                  leftSection={<IconCloudUpload size={16} />}
                >
                  {syncing ? 'Generating & Syncing...' : 'Generate & Sync'}
                </Button>
              </>
            ) : (
              <>
                <Paper p="md" withBorder radius="md" bg={syncResult.success ? 'teal.0' : 'red.0'}>
                  <Group>
                    {syncResult.success ? (
                      <ThemeIcon color="teal" size="lg" radius="xl">
                        <IconCheck size={20} />
                      </ThemeIcon>
                    ) : (
                      <ThemeIcon color="red" size="lg" radius="xl">
                        <IconAlertCircle size={20} />
                      </ThemeIcon>
                    )}
                    <div>
                      <Text fw={600}>{syncResult.success ? 'Sync Complete!' : 'Sync Failed'}</Text>
                      <Text size="sm" c="dimmed">
                        {syncResult.totalResources} total FHIR resources created
                      </Text>
                    </div>
                  </Group>
                </Paper>

                {syncResult.errors && syncResult.errors.length > 0 && (
                  <Paper p="md" withBorder radius="md" bg="red.0">
                    <Text size="sm" fw={600} c="red" mb="xs">Errors:</Text>
                    {syncResult.errors.map((err, i) => (
                      <Text key={i} size="xs" c="red">{err}</Text>
                    ))}
                  </Paper>
                )}

                <Title order={5}>Resources by EHR</Title>

                <Grid>
                  {(['athena', 'elation', 'nextgen'] as const).map((ehr) => (
                    <Grid.Col key={ehr} span={4}>
                      <Paper p="sm" withBorder radius="md">
                        <Text fw={600} size="sm" tt="capitalize" mb="xs">{ehr}</Text>
                        <Stack gap={4}>
                          <Group justify="space-between">
                            <Text size="xs" c="dimmed">Patients</Text>
                            <Text size="xs" fw={500}>{syncResult.summary[ehr].patients}</Text>
                          </Group>
                          <Group justify="space-between">
                            <Text size="xs" c="dimmed">Encounters</Text>
                            <Text size="xs" fw={500}>{syncResult.summary[ehr].encounters}</Text>
                          </Group>
                          <Group justify="space-between">
                            <Text size="xs" c="dimmed">Observations</Text>
                            <Text size="xs" fw={500}>{syncResult.summary[ehr].observations}</Text>
                          </Group>
                          <Group justify="space-between">
                            <Text size="xs" c="dimmed">Conditions</Text>
                            <Text size="xs" fw={500}>{syncResult.summary[ehr].conditions}</Text>
                          </Group>
                          <Group justify="space-between">
                            <Text size="xs" c="dimmed">Allergies</Text>
                            <Text size="xs" fw={500}>{syncResult.summary[ehr].allergies}</Text>
                          </Group>
                          <Group justify="space-between">
                            <Text size="xs" c="dimmed">Medications</Text>
                            <Text size="xs" fw={500}>{syncResult.summary[ehr].medications}</Text>
                          </Group>
                        </Stack>
                      </Paper>
                    </Grid.Col>
                  ))}
                </Grid>

                <Button
                  fullWidth
                  variant="light"
                  onClick={() => setSyncResult(null)}
                >
                  Sync More Data
                </Button>
              </>
            )}
          </Stack>
        </Modal>

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
                    {connectedSystems}/3
                  </Text>
                </div>
                <ThemeIcon color="teal" variant="light" size="lg" radius="md">
                  <IconPlugConnected size={20} />
                </ThemeIcon>
              </Group>
              <Progress value={(connectedSystems / 3) * 100} mt="md" size="sm" color="teal" />
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
                    {totalPatients.toLocaleString()}
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
                    {totalEncounters.toLocaleString()}
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
                    Observations
                  </Text>
                  <Text fw={700} size="xl">
                    {totalObservations.toLocaleString()}
                  </Text>
                </div>
                <ThemeIcon color="orange" variant="light" size="lg" radius="md">
                  <IconCloudUpload size={20} />
                </ThemeIcon>
              </Group>
              <Text size="xs" c="dimmed" mt="md">
                Vitals, labs, and results
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
            {ehrStats.map((stats) => {
              const meta = ehrSystemMeta[stats.system];
              return (
                <Grid.Col key={stats.system} span={{ base: 12, md: 4 }}>
                  <Card withBorder padding="lg" radius="md">
                    <Group justify="space-between" mb="md">
                      <Group gap="sm">
                        <ThemeIcon size={40} radius="md" style={{ backgroundColor: meta.color + '20' }}>
                          <Text fw={700} c={meta.color}>{stats.system.charAt(0).toUpperCase()}</Text>
                        </ThemeIcon>
                        <div>
                          <Text fw={600}>{meta.name}</Text>
                          <Text size="xs" c="dimmed">FHIR R4</Text>
                        </div>
                      </Group>
                      <Badge
                        color={stats.status === 'connected' ? 'teal' : 'gray'}
                        variant="light"
                        leftSection={stats.status === 'connected' ? <IconCheck size={12} /> : null}
                      >
                        {stats.status === 'connected' ? 'Connected' : 'No Data'}
                      </Badge>
                    </Group>

                    <Text size="sm" c="dimmed" mb="md">
                      {meta.description}
                    </Text>

                    <Grid gutter="md">
                      <Grid.Col span={6}>
                        <Text size="xs" c="dimmed">Patients</Text>
                        <Text fw={600}>{stats.patientCount.toLocaleString()}</Text>
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <Text size="xs" c="dimmed">Encounters</Text>
                        <Text fw={600}>{stats.encounterCount.toLocaleString()}</Text>
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <Text size="xs" c="dimmed">Observations</Text>
                        <Text fw={600}>{stats.observationCount.toLocaleString()}</Text>
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <Text size="xs" c="dimmed">Conditions</Text>
                        <Text fw={600}>{stats.conditionCount.toLocaleString()}</Text>
                      </Grid.Col>
                    </Grid>

                    <Text size="xs" c="dimmed" mt="md">
                      {stats.patientCount > 0 ? `${stats.patientCount} patients synced` : 'No data synced yet'}
                    </Text>
                  </Card>
                </Grid.Col>
              );
            })}
          </Grid>
        </Box>

        {/* Recent Sync Activity */}
        {syncHistory.length > 0 && (
          <Paper p="md" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <Title order={3} size="h4">
                Recent Sync Activity
              </Title>
              <Badge variant="light" color="teal" leftSection={<IconActivity size={12} />}>
                {syncHistory.length} syncs
              </Badge>
            </Group>
            <Stack gap="sm">
              {syncHistory.slice(0, 5).map((activity) => {
                const timeAgo = getTimeAgo(activity.timestamp);
                return (
                  <Paper key={activity.id} p="sm" withBorder radius="sm" bg={activity.success ? 'teal.0' : 'red.0'}>
                    <Group justify="space-between">
                      <Group gap="sm">
                        <ThemeIcon
                          size="sm"
                          radius="xl"
                          color={activity.success ? 'teal' : 'red'}
                          variant="filled"
                        >
                          {activity.success ? <IconCheck size={12} /> : <IconAlertCircle size={12} />}
                        </ThemeIcon>
                        <div>
                          <Text size="sm" fw={500}>
                            {activity.success ? 'Sync Complete' : 'Sync Failed'}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {activity.totalResources} resources synced
                          </Text>
                        </div>
                      </Group>
                      <div style={{ textAlign: 'right' }}>
                        <Group gap="xs">
                          {(['athena', 'elation', 'nextgen'] as const).map((ehr) => (
                            <Tooltip key={ehr} label={`${ehrSystemMeta[ehr].name}: ${activity.summary[ehr].patients} patients`}>
                              <Badge size="xs" variant="light" color={ehrSystemMeta[ehr].color}>
                                {ehr.charAt(0).toUpperCase()}: {activity.summary[ehr].patients}
                              </Badge>
                            </Tooltip>
                          ))}
                        </Group>
                        <Text size="xs" c="dimmed" mt={4}>
                          {timeAgo}
                        </Text>
                      </div>
                    </Group>
                  </Paper>
                );
              })}
            </Stack>
            {syncHistory.length > 5 && (
              <Text size="xs" c="dimmed" ta="center" mt="sm">
                + {syncHistory.length - 5} more syncs
              </Text>
            )}
          </Paper>
        )}

        {/* Integration Health */}
        <Paper p="md" radius="md" withBorder>
          <Title order={3} size="h4" mb="md">
            Integration Health Overview
          </Title>
          <Grid>
            {ehrStats.map((stats) => {
              const meta = ehrSystemMeta[stats.system];
              const healthScore = stats.status === 'connected' ? 100 : 0;

              return (
                <Grid.Col key={stats.system} span={{ base: 12, sm: 4 }}>
                  <Card withBorder padding="lg" radius="md">
                    <Flex direction="column" align="center" gap="md">
                      <RingProgress
                        size={100}
                        thickness={10}
                        roundCaps
                        sections={[{ value: healthScore, color: healthScore > 0 ? 'teal' : 'gray' }]}
                        label={
                          <Text ta="center" fw={700} size="lg">
                            {healthScore}%
                          </Text>
                        }
                      />
                      <div style={{ textAlign: 'center' }}>
                        <Text fw={600}>{meta.name}</Text>
                        <Text size="xs" c="dimmed">
                          {stats.patientCount} patients
                        </Text>
                      </div>
                      <Badge
                        color={stats.status === 'connected' ? 'teal' : 'gray'}
                        variant="light"
                        leftSection={stats.status === 'connected' ? <IconCheck size={12} /> : null}
                      >
                        {stats.status === 'connected' ? 'Active' : 'Inactive'}
                      </Badge>
                    </Flex>
                  </Card>
                </Grid.Col>
              );
            })}
          </Grid>
        </Paper>

        {/* FHIR Resource Support */}
        <Paper p="md" radius="md" withBorder>
          <Title order={3} size="h4" mb="md">
            FHIR Resource Support
          </Title>
          <Stack gap="sm">
            {['Patient', 'Encounter', 'Observation', 'Condition', 'AllergyIntolerance', 'MedicationStatement'].map(
              (resource) => (
                <Group key={resource} justify="space-between">
                  <Text size="sm">{resource}</Text>
                  <Group gap="xs">
                    {ehrStats.map((stats) => (
                      <Tooltip key={stats.system} label={ehrSystemMeta[stats.system].name}>
                        <Badge
                          size="xs"
                          variant={stats.status === 'connected' ? 'filled' : 'light'}
                          color={stats.status === 'connected' ? 'teal' : 'gray'}
                        >
                          {stats.system.charAt(0).toUpperCase()}
                        </Badge>
                      </Tooltip>
                    ))}
                  </Group>
                </Group>
              )
            )}
          </Stack>
        </Paper>
      </Stack>
    </Box>
  );
}
