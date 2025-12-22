/**
 * Script to enable bots feature on the Medplum project
 * Run with: npx tsx scripts/enable-bots.ts
 */

import { MedplumClient } from '@medplum/core';
import type { Project } from '@medplum/fhirtypes';

const MEDPLUM_BASE_URL = process.env.MEDPLUM_BASE_URL || 'http://localhost:3000';
const MEDPLUM_CLIENT_ID = process.env.MEDPLUM_CLIENT_ID || '';
const MEDPLUM_CLIENT_SECRET = process.env.MEDPLUM_CLIENT_SECRET || '';

async function enableBots() {
  console.log('Connecting to Medplum at', MEDPLUM_BASE_URL);

  const medplum = new MedplumClient({
    baseUrl: MEDPLUM_BASE_URL,
  });

  // Authenticate
  if (!MEDPLUM_CLIENT_ID || !MEDPLUM_CLIENT_SECRET) {
    console.error('Missing MEDPLUM_CLIENT_ID or MEDPLUM_CLIENT_SECRET');
    console.log('Set these environment variables or run from docker container');
    process.exit(1);
  }

  await medplum.startClientLogin(MEDPLUM_CLIENT_ID, MEDPLUM_CLIENT_SECRET);
  console.log('Authenticated successfully');

  // Get the project
  const projects = await medplum.searchResources('Project', {});

  if (projects.length === 0) {
    console.error('No projects found');
    process.exit(1);
  }

  const project = projects[0];
  console.log('Found project:', project.id, project.name);
  console.log('Current features:', project.features || []);

  // Check if bots already enabled
  if (project.features?.includes('bots')) {
    console.log('Bots feature is already enabled!');
    return;
  }

  // Add bots to features
  const updatedProject: Project = {
    ...project,
    features: [...(project.features || []), 'bots'],
  };

  await medplum.updateResource(updatedProject);
  console.log('Bots feature enabled successfully!');
  console.log('New features:', updatedProject.features);
}

enableBots().catch(console.error);
