import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconDatabase,
  IconLoader,
  IconPlugConnectedX,
  IconRefresh,
  IconSettings,
  IconUsers,
} from '@tabler/icons-react';
import type { JSX } from 'react';
import { type EhrConnection, ehrSystemMeta } from '../../services/mockEhrData';
import classes from './EhrConnectionCard.module.css';

interface EhrConnectionCardProps {
  connection: EhrConnection;
}

export function EhrConnectionCard({ connection }: EhrConnectionCardProps): JSX.Element {
  const meta = ehrSystemMeta[connection.system];

  const statusConfig = {
    connected: { color: 'green', icon: IconCheck, label: 'Connected' },
    syncing: { color: 'blue', icon: IconLoader, label: 'Syncing' },
    error: { color: 'red', icon: IconAlertCircle, label: 'Error' },
    disconnected: { color: 'gray', icon: IconPlugConnectedX, label: 'Disconnected' },
  };

  const status = statusConfig[connection.status];
  const StatusIcon = status.icon;

  const timeSinceSync = () => {
    const diff = Date.now() - new Date(connection.lastSync).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <Card withBorder padding="lg" radius="md" className={classes.card}>
      <Card.Section withBorder inheritPadding py="xs">
        <Group justify="space-between">
          <Group gap="sm">
            <Avatar
              src={meta.logo}
              size={40}
              radius="md"
              style={{ backgroundColor: meta.color + '15', border: `1px solid ${meta.color}30` }}
            >
              {connection.system.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <Text fw={600} size="md">
                {meta.name}
              </Text>
              <Text size="xs" c="dimmed">
                FHIR {connection.fhirVersion} | API {connection.apiVersion}
              </Text>
            </div>
          </Group>
          <Badge
            color={status.color}
            variant="light"
            leftSection={
              <StatusIcon
                size={12}
                className={connection.status === 'syncing' ? classes.spinning : undefined}
              />
            }
          >
            {status.label}
          </Badge>
        </Group>
      </Card.Section>

      <Stack gap="sm" mt="md">
        <Text size="xs" c="dimmed" lineClamp={2}>
          {meta.description}
        </Text>

        <Divider />

        <Group justify="space-between">
          <Group gap="xs">
            <ThemeIcon size="sm" variant="light" color="blue">
              <IconUsers size={12} />
            </ThemeIcon>
            <Text size="sm">{connection.patientCount.toLocaleString()} patients</Text>
          </Group>
          <Group gap="xs">
            <ThemeIcon size="sm" variant="light" color="violet">
              <IconDatabase size={12} />
            </ThemeIcon>
            <Text size="sm">{connection.encounterCount.toLocaleString()} encounters</Text>
          </Group>
        </Group>

        {connection.pendingRecords > 0 && (
          <Badge color="orange" variant="light" fullWidth>
            {connection.pendingRecords} records pending sync
          </Badge>
        )}

        <Divider />

        <Group justify="space-between">
          <Text size="xs" c="dimmed">
            Last synced: {timeSinceSync()}
          </Text>
          <Group gap="xs">
            <Tooltip label="Configure">
              <Button variant="subtle" size="xs" color="gray" p={4}>
                <IconSettings size={16} />
              </Button>
            </Tooltip>
            <Tooltip label="Sync Now">
              <Button variant="subtle" size="xs" color="blue" p={4}>
                <IconRefresh size={16} />
              </Button>
            </Tooltip>
          </Group>
        </Group>

        <div className={classes.capabilities}>
          <Text size="xs" c="dimmed" mb="xs">
            Supported Resources:
          </Text>
          <Group gap={4}>
            {connection.capabilities.slice(0, 5).map((cap) => (
              <Badge key={cap} size="xs" variant="outline" color="gray">
                {cap}
              </Badge>
            ))}
            {connection.capabilities.length > 5 && (
              <Tooltip label={connection.capabilities.slice(5).join(', ')}>
                <Badge size="xs" variant="outline" color="gray">
                  +{connection.capabilities.length - 5}
                </Badge>
              </Tooltip>
            )}
          </Group>
        </div>
      </Stack>
    </Card>
  );
}
