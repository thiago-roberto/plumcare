import { Box, Group, Text } from '@mantine/core';
import { IconHeartbeat } from '@tabler/icons-react';
import type { JSX } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import './LoadingPage.css';

export function LoadingPage(): JSX.Element {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Box className="loading-container">
      <Group gap="md" align="center">
        {/* Heart icon with pulse effect */}
        <Box className="heart-wrapper">
          {/* Pulse ring */}
          <Box className="pulse-ring" />
          {/* Heart icon */}
          <IconHeartbeat size={48} color="#ff5500" className="heart-icon" />
        </Box>

        {/* Text */}
        <Text fw={700} size="2rem" className="logo-text">
          PlumCare
        </Text>
      </Group>

      <Text size="sm" c="dimmed" mt="xl" className="loading-text">
        Loading your dashboard...
      </Text>
    </Box>
  );
}
