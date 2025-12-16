import { Group, Text } from '@mantine/core';
import { IconHeartbeat } from '@tabler/icons-react';
import type { JSX } from 'react';

interface PlumCareLogoProps {
  size?: number;
}

export function PlumCareLogo({ size = 24 }: PlumCareLogoProps): JSX.Element {
  return (
    <Group gap={8} wrap="nowrap">
      <IconHeartbeat
        size={size}
        stroke={2}
        style={{ color: '#ff5500' }}
      />
      <Text
        fw={700}
        size="lg"
        style={{
          color: '#14334b',
          letterSpacing: '-0.02em',
        }}
      >
        PlumCare
      </Text>
    </Group>
  );
}
