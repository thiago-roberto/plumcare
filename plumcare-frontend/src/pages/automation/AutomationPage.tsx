import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Code,
  Divider,
  Grid,
  Group,
  Loader,
  Modal,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconBell,
  IconCheck,
  IconCode,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlus,
  IconRefresh,
  IconRobot,
  IconTrash,
  IconWebhook,
  IconX,
  IconAlertCircle,
  IconTemplate,
} from '@tabler/icons-react';
import type { JSX } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  getSubscriptions,
  createSubscription,
  createDefaultSubscriptions,
  pauseSubscription,
  resumeSubscription,
  deleteSubscription,
  getBots,
  getBotTemplates,
  createBotFromTemplate,
  deleteBot,
  getWebhookEvents,
  type Subscription,
  type SubscriptionConfig,
  type Bot,
  type BotTemplate,
  type WebhookEvent,
} from '../../services/ehrApi';

const RESOURCE_TYPES = [
  'Patient',
  'Encounter',
  'Observation',
  'Condition',
  'DiagnosticReport',
  'Task',
  'Communication',
  'AllergyIntolerance',
  'MedicationStatement',
];

const INTERACTION_OPTIONS = [
  { value: 'create', label: 'On Create' },
  { value: 'update', label: 'On Update' },
  { value: 'delete', label: 'On Delete' },
];

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function AutomationPage(): JSX.Element {
  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [subscriptionModalOpen, setSubscriptionModalOpen] = useState(false);
  const [newSubscription, setNewSubscription] = useState<SubscriptionConfig>({
    name: '',
    criteria: 'Patient',
    interaction: 'create',
  });

  // Bots state
  const [bots, setBots] = useState<Bot[]>([]);
  const [botTemplates, setBotTemplates] = useState<BotTemplate[]>([]);
  const [loadingBots, setLoadingBots] = useState(true);
  const [botModalOpen, setBotModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [newBotName, setNewBotName] = useState('');

  // Webhooks state
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(true);

  // General state
  const [activeTab, setActiveTab] = useState<string | null>('subscriptions');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Fetch subscriptions
  const fetchSubscriptions = useCallback(async () => {
    try {
      setLoadingSubscriptions(true);
      const data = await getSubscriptions();
      setSubscriptions(data || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setSubscriptions([]);
    } finally {
      setLoadingSubscriptions(false);
    }
  }, []);

  // Fetch bots
  const fetchBots = useCallback(async () => {
    try {
      setLoadingBots(true);
      const [botsData, templatesData] = await Promise.all([
        getBots(),
        getBotTemplates(),
      ]);
      setBots(botsData || []);
      setBotTemplates(templatesData || []);
    } catch (err) {
      console.error('Error fetching bots:', err);
      setBots([]);
      setBotTemplates([]);
    } finally {
      setLoadingBots(false);
    }
  }, []);

  // Fetch webhook events
  const fetchWebhooks = useCallback(async () => {
    try {
      setLoadingWebhooks(true);
      const data = await getWebhookEvents(20);
      setWebhookEvents(data || []);
    } catch (err) {
      console.error('Error fetching webhooks:', err);
      setWebhookEvents([]);
    } finally {
      setLoadingWebhooks(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
    fetchBots();
    fetchWebhooks();
  }, [fetchSubscriptions, fetchBots, fetchWebhooks]);

  // Create subscription
  const handleCreateSubscription = async () => {
    if (!newSubscription.name || !newSubscription.criteria) return;

    try {
      setCreating(true);
      setError(null);
      await createSubscription(newSubscription);
      await fetchSubscriptions();
      setSubscriptionModalOpen(false);
      setNewSubscription({ name: '', criteria: 'Patient', interaction: 'create' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create subscription');
    } finally {
      setCreating(false);
    }
  };

  // Create default subscriptions
  const handleCreateDefaults = async () => {
    try {
      setCreating(true);
      setError(null);
      await createDefaultSubscriptions();
      await fetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create default subscriptions');
    } finally {
      setCreating(false);
    }
  };

  // Toggle subscription status
  const handleToggleSubscription = async (sub: Subscription) => {
    if (!sub.id) return;
    try {
      if (sub.status === 'active') {
        await pauseSubscription(sub.id);
      } else {
        await resumeSubscription(sub.id);
      }
      await fetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle subscription');
    }
  };

  // Delete subscription
  const handleDeleteSubscription = async (id: string) => {
    try {
      await deleteSubscription(id);
      await fetchSubscriptions();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete subscription');
    }
  };

  // Create bot from template
  const handleCreateBot = async () => {
    if (!newBotName || !selectedTemplate) return;

    try {
      setCreating(true);
      setError(null);
      await createBotFromTemplate(newBotName, selectedTemplate);
      await fetchBots();
      setBotModalOpen(false);
      setNewBotName('');
      setSelectedTemplate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create bot');
    } finally {
      setCreating(false);
    }
  };

  // Delete bot
  const handleDeleteBot = async (id: string) => {
    try {
      await deleteBot(id);
      await fetchBots();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bot');
    }
  };

  return (
    <Box p="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <Box>
            <Title order={1} mb="xs">
              Automation
            </Title>
            <Text c="dimmed" size="sm">
              Manage subscriptions (webhooks) and bots (serverless functions) for automated workflows
            </Text>
          </Box>
          <Button
            leftSection={<IconRefresh size={16} />}
            variant="subtle"
            onClick={() => {
              fetchSubscriptions();
              fetchBots();
              fetchWebhooks();
            }}
          >
            Refresh
          </Button>
        </Group>

        {/* Error display */}
        {error && (
          <Paper p="md" bg="red.0" withBorder radius="md">
            <Group>
              <ThemeIcon color="red" variant="light">
                <IconAlertCircle size={16} />
              </ThemeIcon>
              <Text size="sm" c="red">{error}</Text>
              <ActionIcon ml="auto" variant="subtle" color="red" onClick={() => setError(null)}>
                <IconX size={16} />
              </ActionIcon>
            </Group>
          </Paper>
        )}

        {/* Overview Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Paper p="md" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    Active Subscriptions
                  </Text>
                  <Text fw={700} size="xl">
                    {subscriptions.filter(s => s.status === 'active').length}
                  </Text>
                </div>
                <ThemeIcon color="blue" variant="light" size="lg" radius="md">
                  <IconBell size={20} />
                </ThemeIcon>
              </Group>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Paper p="md" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    Deployed Bots
                  </Text>
                  <Text fw={700} size="xl">
                    {bots.length}
                  </Text>
                </div>
                <ThemeIcon color="violet" variant="light" size="lg" radius="md">
                  <IconRobot size={20} />
                </ThemeIcon>
              </Group>
            </Paper>
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 4 }}>
            <Paper p="md" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text c="dimmed" size="xs" tt="uppercase" fw={700}>
                    Webhook Events
                  </Text>
                  <Text fw={700} size="xl">
                    {webhookEvents.length}
                  </Text>
                </div>
                <ThemeIcon color="teal" variant="light" size="lg" radius="md">
                  <IconWebhook size={20} />
                </ThemeIcon>
              </Group>
            </Paper>
          </Grid.Col>
        </Grid>

        {/* Tabs */}
        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="subscriptions" leftSection={<IconBell size={16} />}>
              Subscriptions
            </Tabs.Tab>
            <Tabs.Tab value="bots" leftSection={<IconRobot size={16} />}>
              Bots
            </Tabs.Tab>
            <Tabs.Tab value="webhooks" leftSection={<IconWebhook size={16} />}>
              Webhook Events
            </Tabs.Tab>
          </Tabs.List>

          {/* Subscriptions Tab */}
          <Tabs.Panel value="subscriptions" pt="xl">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600}>Event Subscriptions</Text>
                <Group>
                  <Button
                    variant="light"
                    leftSection={<IconTemplate size={16} />}
                    onClick={handleCreateDefaults}
                    loading={creating}
                  >
                    Create Defaults
                  </Button>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => setSubscriptionModalOpen(true)}
                  >
                    New Subscription
                  </Button>
                </Group>
              </Group>

              {loadingSubscriptions ? (
                <Center h={200}>
                  <Loader />
                </Center>
              ) : subscriptions.length === 0 ? (
                <Paper p="xl" withBorder radius="md">
                  <Center>
                    <Stack align="center" gap="md">
                      <ThemeIcon size={60} radius="xl" color="gray" variant="light">
                        <IconBell size={30} />
                      </ThemeIcon>
                      <Text c="dimmed">No subscriptions yet</Text>
                      <Text size="sm" c="dimmed" ta="center" maw={400}>
                        Subscriptions are like sensors that watch for changes in your FHIR resources
                        and notify your webhook endpoint when something happens.
                      </Text>
                      <Button onClick={handleCreateDefaults} loading={creating}>
                        Create Default Subscriptions
                      </Button>
                    </Stack>
                  </Center>
                </Paper>
              ) : (
                <Grid>
                  {subscriptions.map((sub) => (
                    <Grid.Col key={sub.id} span={{ base: 12, md: 6, lg: 4 }}>
                      <Card withBorder padding="lg" radius="md">
                        <Group justify="space-between" mb="xs">
                          <Text fw={600} lineClamp={1}>{sub.reason || 'Unnamed'}</Text>
                          <Badge
                            color={sub.status === 'active' ? 'teal' : 'gray'}
                            variant="light"
                          >
                            {sub.status}
                          </Badge>
                        </Group>

                        <Stack gap="xs" mb="md">
                          <Group gap="xs">
                            <Text size="xs" c="dimmed">Watches:</Text>
                            <Badge size="sm" variant="outline">{sub.criteria}</Badge>
                          </Group>
                          <Group gap="xs">
                            <Text size="xs" c="dimmed">Endpoint:</Text>
                            <Text size="xs" lineClamp={1}>
                              {sub.channel?.endpoint || 'Default'}
                            </Text>
                          </Group>
                        </Stack>

                        <Divider mb="sm" />

                        <Group justify="flex-end" gap="xs">
                          <Tooltip label={sub.status === 'active' ? 'Pause' : 'Resume'}>
                            <ActionIcon
                              variant="light"
                              color={sub.status === 'active' ? 'orange' : 'teal'}
                              onClick={() => handleToggleSubscription(sub)}
                            >
                              {sub.status === 'active' ? (
                                <IconPlayerPause size={16} />
                              ) : (
                                <IconPlayerPlay size={16} />
                              )}
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Delete">
                            <ActionIcon
                              variant="light"
                              color="red"
                              onClick={() => sub.id && handleDeleteSubscription(sub.id)}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Card>
                    </Grid.Col>
                  ))}
                </Grid>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Bots Tab */}
          <Tabs.Panel value="bots" pt="xl">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600}>Serverless Bots</Text>
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => setBotModalOpen(true)}
                >
                  New Bot
                </Button>
              </Group>

              {loadingBots ? (
                <Center h={200}>
                  <Loader />
                </Center>
              ) : (
                <>
                  {/* Bot Templates */}
                  <Paper p="md" withBorder radius="md" bg="grape.0">
                    <Text fw={600} mb="md">Available Templates</Text>
                    <Grid>
                      {botTemplates.map((template) => (
                        <Grid.Col key={template.key} span={{ base: 12, sm: 6, md: 4 }}>
                          <Card withBorder padding="md" radius="md" h="100%">
                            <Group gap="sm" mb="xs">
                              <ThemeIcon size="sm" color="violet" variant="light">
                                <IconCode size={14} />
                              </ThemeIcon>
                              <Text size="sm" fw={600}>{template.name}</Text>
                            </Group>
                            <Text size="xs" c="dimmed" mb="md">
                              {template.description}
                            </Text>
                            <Button
                              size="xs"
                              variant="light"
                              fullWidth
                              onClick={() => {
                                setSelectedTemplate(template.key);
                                setNewBotName(template.name);
                                setBotModalOpen(true);
                              }}
                            >
                              Use Template
                            </Button>
                          </Card>
                        </Grid.Col>
                      ))}
                    </Grid>
                  </Paper>

                  {/* Deployed Bots */}
                  {bots.length === 0 ? (
                    <Paper p="xl" withBorder radius="md">
                      <Center>
                        <Stack align="center" gap="md">
                          <ThemeIcon size={60} radius="xl" color="gray" variant="light">
                            <IconRobot size={30} />
                          </ThemeIcon>
                          <Text c="dimmed">No bots deployed yet</Text>
                          <Text size="sm" c="dimmed" ta="center" maw={400}>
                            Bots are serverless functions that execute automatically when triggered
                            by subscriptions or manually. Use a template above to get started.
                          </Text>
                        </Stack>
                      </Center>
                    </Paper>
                  ) : (
                    <>
                      <Text fw={600}>Deployed Bots</Text>
                      <Grid>
                        {bots.map((bot) => (
                          <Grid.Col key={bot.id} span={{ base: 12, md: 6, lg: 4 }}>
                            <Card withBorder padding="lg" radius="md">
                              <Group justify="space-between" mb="xs">
                                <Group gap="sm">
                                  <ThemeIcon color="violet" variant="light">
                                    <IconRobot size={16} />
                                  </ThemeIcon>
                                  <Text fw={600}>{bot.name}</Text>
                                </Group>
                                <Badge color="teal" variant="light">Deployed</Badge>
                              </Group>

                              {bot.description && (
                                <Text size="sm" c="dimmed" mb="md" lineClamp={2}>
                                  {bot.description}
                                </Text>
                              )}

                              <Group gap="xs">
                                <Text size="xs" c="dimmed">Runtime:</Text>
                                <Code>{bot.runtimeVersion || 'awslambda'}</Code>
                              </Group>

                              {bot.meta?.lastUpdated && (
                                <Text size="xs" c="dimmed" mt="xs">
                                  Updated {formatTimeAgo(bot.meta.lastUpdated)}
                                </Text>
                              )}

                              <Divider my="sm" />

                              <Group justify="flex-end" gap="xs">
                                <Tooltip label="Delete">
                                  <ActionIcon
                                    variant="light"
                                    color="red"
                                    onClick={() => bot.id && handleDeleteBot(bot.id)}
                                  >
                                    <IconTrash size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              </Group>
                            </Card>
                          </Grid.Col>
                        ))}
                      </Grid>
                    </>
                  )}
                </>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Webhooks Tab */}
          <Tabs.Panel value="webhooks" pt="xl">
            <Stack gap="md">
              <Group justify="space-between">
                <Text fw={600}>Recent Webhook Events</Text>
                <Button
                  variant="subtle"
                  leftSection={<IconRefresh size={16} />}
                  onClick={fetchWebhooks}
                >
                  Refresh
                </Button>
              </Group>

              {loadingWebhooks ? (
                <Center h={200}>
                  <Loader />
                </Center>
              ) : webhookEvents.length === 0 ? (
                <Paper p="xl" withBorder radius="md">
                  <Center>
                    <Stack align="center" gap="md">
                      <ThemeIcon size={60} radius="xl" color="gray" variant="light">
                        <IconWebhook size={30} />
                      </ThemeIcon>
                      <Text c="dimmed">No webhook events yet</Text>
                      <Text size="sm" c="dimmed" ta="center" maw={400}>
                        Webhook events will appear here when your subscriptions are triggered.
                        Create subscriptions and sync some data to see events.
                      </Text>
                    </Stack>
                  </Center>
                </Paper>
              ) : (
                <ScrollArea h={500}>
                  <Stack gap="xs">
                    {webhookEvents.map((event) => {
                      const payload = event.payload as Record<string, unknown> | undefined;
                      const ehrSystem = payload?.ehrSystem as string | undefined;
                      const ehrSystemDisplay = payload?.ehrSystemDisplay as string | undefined;
                      const patientName = payload?.patientName as string | undefined;
                      const patientReference = payload?.patientReference as string | undefined;
                      const value = payload?.value as string | undefined;
                      const code = payload?.code as string | undefined;
                      const clinicalStatus = payload?.clinicalStatus as string | undefined;

                      // Build description based on resource type
                      let description = '';
                      if (event.resourceType === 'Patient' && patientName) {
                        description = patientName;
                      } else if (event.resourceType === 'Observation' && code) {
                        description = value ? `${code}: ${value}` : code;
                      } else if (event.resourceType === 'Condition' && code) {
                        description = clinicalStatus ? `${code} (${clinicalStatus})` : code;
                      } else if (event.resourceType === 'Encounter') {
                        const encounterType = payload?.type as string | undefined;
                        description = encounterType || payload?.status as string || '';
                      }

                      return (
                        <Paper key={event.id} p="sm" withBorder radius="sm">
                          <Group justify="space-between" align="flex-start">
                            <Group gap="sm" align="flex-start">
                              <ThemeIcon
                                size="sm"
                                color={event.processed ? 'teal' : 'orange'}
                                variant="light"
                                mt={2}
                              >
                                {event.processed ? <IconCheck size={14} /> : <IconWebhook size={14} />}
                              </ThemeIcon>
                              <div>
                                <Group gap="xs" mb={4}>
                                  <Badge size="xs" variant="outline" color="orange">{event.resourceType}</Badge>
                                  <Badge size="xs" color="blue" variant="light">{event.action}</Badge>
                                  {ehrSystem && (
                                    <Badge
                                      size="xs"
                                      variant="light"
                                      color={
                                        ehrSystem === 'athena' ? 'teal' :
                                        ehrSystem === 'elation' ? 'violet' :
                                        ehrSystem === 'nextgen' ? 'indigo' : 'gray'
                                      }
                                    >
                                      {ehrSystemDisplay || ehrSystem}
                                    </Badge>
                                  )}
                                </Group>
                                {description && (
                                  <Text size="sm" fw={500} mb={2}>
                                    {description}
                                  </Text>
                                )}
                                <Text size="xs" c="dimmed">
                                  ID: {event.resourceId}
                                </Text>
                                {patientReference && event.resourceType !== 'Patient' && (
                                  <Text size="xs" c="dimmed">
                                    Patient: {patientReference.replace('Patient/', '')}
                                  </Text>
                                )}
                              </div>
                            </Group>
                            <Text size="xs" c="dimmed">
                              {formatTimeAgo(event.timestamp)}
                            </Text>
                          </Group>
                        </Paper>
                      );
                    })}
                  </Stack>
                </ScrollArea>
              )}
            </Stack>
          </Tabs.Panel>
        </Tabs>

        {/* Create Subscription Modal */}
        <Modal
          opened={subscriptionModalOpen}
          onClose={() => setSubscriptionModalOpen(false)}
          title="Create Subscription"
          size="md"
        >
          <Stack gap="md">
            <TextInput
              label="Name"
              placeholder="e.g., New Patient Notifications"
              value={newSubscription.name}
              onChange={(e) => setNewSubscription({ ...newSubscription, name: e.target.value })}
              required
            />

            <Select
              label="Resource Type"
              description="Which FHIR resource to watch"
              data={RESOURCE_TYPES}
              value={newSubscription.criteria}
              onChange={(value) => setNewSubscription({ ...newSubscription, criteria: value || 'Patient' })}
              required
            />

            <Select
              label="Trigger On"
              description="When should this subscription fire?"
              data={INTERACTION_OPTIONS}
              value={newSubscription.interaction}
              onChange={(value) => setNewSubscription({
                ...newSubscription,
                interaction: (value as 'create' | 'update' | 'delete') || 'create'
              })}
            />

            <Textarea
              label="Custom Endpoint (optional)"
              description="Leave empty to use the default webhook handler"
              placeholder="https://your-server.com/webhook"
              value={newSubscription.endpoint || ''}
              onChange={(e) => setNewSubscription({ ...newSubscription, endpoint: e.target.value || undefined })}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setSubscriptionModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateSubscription} loading={creating}>
                Create Subscription
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Create Bot Modal */}
        <Modal
          opened={botModalOpen}
          onClose={() => {
            setBotModalOpen(false);
            setSelectedTemplate(null);
            setNewBotName('');
          }}
          title="Create Bot from Template"
          size="md"
        >
          <Stack gap="md">
            <Select
              label="Template"
              description="Choose a bot template"
              data={botTemplates.map(t => ({ value: t.key, label: t.name }))}
              value={selectedTemplate}
              onChange={setSelectedTemplate}
              required
            />

            {selectedTemplate && (
              <Paper p="sm" bg="gray.0" radius="sm">
                <Text size="sm" c="dimmed">
                  {botTemplates.find(t => t.key === selectedTemplate)?.description}
                </Text>
              </Paper>
            )}

            <TextInput
              label="Bot Name"
              placeholder="e.g., My Welcome Email Bot"
              value={newBotName}
              onChange={(e) => setNewBotName(e.target.value)}
              required
            />

            <Group justify="flex-end" mt="md">
              <Button variant="light" onClick={() => setBotModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateBot}
                loading={creating}
                disabled={!selectedTemplate || !newBotName}
              >
                Create Bot
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Box>
  );
}
