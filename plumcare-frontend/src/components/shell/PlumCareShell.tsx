import {
  Box,
  Button,
  Container,
  Group,
  Tabs,
  Text,
  ThemeIcon,
} from '@mantine/core';
import {
  IconHeartbeat,
  IconHome,
  IconLogout,
  IconPlugConnected,
  IconUserPlus,
  IconUsers,
} from '@tabler/icons-react';
import type { JSX, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import classes from './PlumCareShell.module.css';

interface PlumCareShellProps {
  children: ReactNode;
  onSignOut?: () => void;
}

const navItems = [
  { icon: IconHome, label: 'Home', value: '/' },
  { icon: IconPlugConnected, label: 'EHR Integrations', value: '/ehr-integrations' },
  { icon: IconUsers, label: 'Patients', value: '/patients' },
  { icon: IconUserPlus, label: 'New Patient', value: '/new-patient' },
];

export function PlumCareShell({ children, onSignOut }: PlumCareShellProps): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();

  const currentTab = navItems.find(
    (item) => item.value === location.pathname ||
    (item.value !== '/' && location.pathname.startsWith(item.value))
  )?.value || '/';

  return (
    <Box className={classes.shell}>
      {/* Header */}
      <Box className={classes.header}>
        <Container size="xl" h="100%">
          <Group h="100%" justify="space-between">
            {/* Logo */}
            <Group
              gap={10}
              className={classes.logo}
              onClick={() => navigate('/')}
            >
              <ThemeIcon size={40} radius="md" className={classes.logoIcon}>
                <IconHeartbeat size={24} stroke={2} />
              </ThemeIcon>
              <div>
                <Text fw={700} size="xl" className={classes.logoText}>
                  PlumCare
                </Text>
              </div>
            </Group>

            {/* Navigation Tabs */}
            <Tabs
              value={currentTab}
              onChange={(value) => value && navigate(value)}
              variant="pills"
              classNames={{
                root: classes.tabsRoot,
                list: classes.tabsList,
                tab: classes.tab,
              }}
            >
              <Tabs.List>
                {navItems.map((item) => (
                  <Tabs.Tab
                    key={item.value}
                    value={item.value}
                    leftSection={<item.icon size={18} />}
                  >
                    {item.label}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs>

            {/* Sign Out */}
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconLogout size={18} />}
              onClick={onSignOut}
              className={classes.signOutButton}
            >
              Sign Out
            </Button>
          </Group>
        </Container>
      </Box>

      {/* Main Content */}
      <Box className={classes.main}>
        <Container size="xl" py="xl">
          {children}
        </Container>
      </Box>
    </Box>
  );
}
