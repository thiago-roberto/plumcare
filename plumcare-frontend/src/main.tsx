// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import { MantineProvider, createTheme, mergeMantineTheme, DEFAULT_THEME } from '@mantine/core';
import { plumcareTheme } from './theme/plumcare';
import '@mantine/core/styles.css';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import '@mantine/spotlight/styles.css';
import { MedplumClient } from '@medplum/core';
import { MedplumProvider } from '@medplum/react';
import '@medplum/react/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { App } from './App';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

// Auto-detect Medplum base URL from environment variable
// If not set, defaults to Medplum cloud (https://api.medplum.com/)
// For local development: set VITE_MEDPLUM_BASE_URL=http://localhost:3000/
const baseUrl = import.meta.env.VITE_MEDPLUM_BASE_URL || undefined;

const medplum = new MedplumClient({
  onUnauthenticated: () => (window.location.href = '/'),
  baseUrl,
  cacheTime: 60000,
  autoBatchTime: 100,
});

const theme = mergeMantineTheme(DEFAULT_THEME, createTheme(plumcareTheme));

const router = createBrowserRouter([{ path: '*', element: <App /> }]);

const navigate = (path: string): Promise<void> => router.navigate(path);

const container = document.getElementById('root') as HTMLDivElement;
const root = createRoot(container);
root.render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <MedplumProvider medplum={medplum} navigate={navigate}>
        <MantineProvider theme={theme}>
          <Notifications position="bottom-right" />
          <RouterProvider router={router} />
        </MantineProvider>
      </MedplumProvider>
    </QueryClientProvider>
  </StrictMode>
);
