import { Badge, Box, Group, Stack, Text, ThemeIcon, Timeline } from '@mantine/core';
import {
  IconAlertCircle,
  IconCheck,
  IconClock,
  IconFileText,
  IconHeartbeat,
  IconStethoscope,
  IconUser,
  IconVirus,
} from '@tabler/icons-react';
import type { JSX } from 'react';
import { type SyncEvent, ehrSystemMeta } from '../../services/ehrApi';

interface SyncActivityFeedProps {
  events: SyncEvent[];
}

export function SyncActivityFeed({ events }: SyncActivityFeedProps): JSX.Element {
  const getResourceIcon = (type: SyncEvent['type']) => {
    switch (type) {
      case 'patient':
        return IconUser;
      case 'encounter':
        return IconStethoscope;
      case 'observation':
        return IconHeartbeat;
      case 'condition':
        return IconVirus;
      case 'diagnostic_report':
        return IconFileText;
      default:
        return IconFileText;
    }
  };

  const getStatusColor = (status: SyncEvent['status']) => {
    switch (status) {
      case 'success':
        return 'teal';
      case 'failed':
        return 'red';
      case 'pending':
        return 'orange';
      default:
        return 'gray';
    }
  };

  const getStatusIcon = (status: SyncEvent['status']) => {
    switch (status) {
      case 'success':
        return IconCheck;
      case 'failed':
        return IconAlertCircle;
      case 'pending':
        return IconClock;
      default:
        return IconClock;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  const getActionColor = (action: SyncEvent['action']) => {
    switch (action) {
      case 'created':
        return 'teal';
      case 'updated':
        return 'orange';
      case 'deleted':
        return 'red';
      default:
        return 'gray';
    }
  };

  return (
    <Timeline active={events.length} bulletSize={32} lineWidth={2}>
      {events.map((event) => {
        const ResourceIcon = getResourceIcon(event.type);
        const StatusIcon = getStatusIcon(event.status);
        const meta = ehrSystemMeta[event.system];

        return (
          <Timeline.Item
            key={event.id}
            bullet={
              <ThemeIcon
                size={32}
                variant="filled"
                color={getStatusColor(event.status)}
                radius="xl"
                style={{ color: '#fff' }}
              >
                <ResourceIcon size={16} stroke={2} />
              </ThemeIcon>
            }
          >
            <Box>
              <Group justify="space-between" mb={4}>
                <Group gap="xs">
                  <Text size="sm" fw={500}>
                    {event.type.charAt(0).toUpperCase() + event.type.slice(1).replace('_', ' ')}
                  </Text>
                  <Badge size="xs" color={getActionColor(event.action)} variant="light">
                    {event.action}
                  </Badge>
                </Group>
                <Group gap="xs">
                  <Badge size="xs" variant="outline" color="gray">
                    {meta.name}
                  </Badge>
                  <Badge
                    size="xs"
                    color={getStatusColor(event.status)}
                    variant="light"
                    leftSection={<StatusIcon size={10} />}
                  >
                    {event.status}
                  </Badge>
                </Group>
              </Group>
              <Text size="xs" c="dimmed">
                {event.details}
              </Text>
              <Group gap="xs" mt={4}>
                <Text size="xs" c="dimmed">
                  {event.resourceId}
                </Text>
                <Text size="xs" c="dimmed">
                  {formatTimestamp(event.timestamp)}
                </Text>
              </Group>
            </Box>
          </Timeline.Item>
        );
      })}
    </Timeline>
  );
}
