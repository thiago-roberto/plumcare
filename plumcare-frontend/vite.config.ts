// SPDX-FileCopyrightText: Copyright Orangebot, Inc. and Medplum contributors
// SPDX-License-Identifier: Apache-2.0
import react from '@vitejs/plugin-react';
import dns from 'dns';
import { existsSync } from 'fs';
import path from 'path';
import type { UserConfig } from 'vite';
import { defineConfig } from 'vitest/config';

dns.setDefaultResultOrder('verbatim');

// Resolve aliases to local packages when working within the monorepo
const monorepoAliases: NonNullable<UserConfig['resolve']>['alias'] = Object.fromEntries(
  Object.entries({
    '@medplum/core': path.resolve(__dirname, '../../packages/core/src'),
    '@medplum/dosespot-react': path.resolve(__dirname, '../../packages/dosespot-react/src'),
    '@medplum/react$': path.resolve(__dirname, '../../packages/react/src'),
    '@medplum/react/styles.css': path.resolve(__dirname, '../../packages/react/dist/esm/index.css'),
    '@medplum/react-hooks': path.resolve(__dirname, '../../packages/react-hooks/src'),
    '@medplum/health-gorilla-core': path.resolve(__dirname, '../../packages/health-gorilla-core/src'),
    '@medplum/health-gorilla-react': path.resolve(__dirname, '../../packages/health-gorilla-react/src'),
  }).filter(([, relPath]) => existsSync(relPath))
);

// Path aliases for cleaner imports
const pathAliases: NonNullable<UserConfig['resolve']>['alias'] = {
  '@': path.resolve(__dirname, './src'),
  '@components': path.resolve(__dirname, './src/components'),
  '@services': path.resolve(__dirname, './src/services'),
  '@hooks': path.resolve(__dirname, './src/hooks'),
  '@utils': path.resolve(__dirname, './src/utils'),
  '@types': path.resolve(__dirname, './src/types'),
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Allow connections from Docker
    port: 4000,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4000,
  },
  resolve: {
    alias: {
      ...monorepoAliases,
      ...pathAliases,
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test.setup.ts',
  },
});
