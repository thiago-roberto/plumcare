/**
 * Setup script to create a ClientApplication in Medplum
 *
 * This script authenticates as an admin user and uses the admin API
 * to create a ClientApplication with a properly generated secret.
 */

const MEDPLUM_BASE_URL = process.env.MEDPLUM_BASE_URL || 'http://localhost:3000';

interface LoginResponse {
  login: string;
  code?: string;
  memberships?: Array<{ project: { reference: string } }>;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  project?: { reference: string };
}

interface ClientApplicationResponse {
  id: string;
  name: string;
  secret: string;
}

async function setupMedplumClient() {
  console.log('Setting up Medplum ClientApplication...\n');
  console.log(`Medplum Base URL: ${MEDPLUM_BASE_URL}\n`);

  const email = 'admin@example.com';
  const password = 'medplum_admin';
  const clientAppName = 'PlumCare Backend';

  // Step 1: Start login to get login token
  console.log(`Logging in as ${email}...`);

  const loginResponse = await fetch(`${MEDPLUM_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      scope: 'openid profile',
      codeChallengeMethod: 'plain',
      codeChallenge: 'xyz',
    }),
  });

  if (!loginResponse.ok) {
    const error = await loginResponse.text();
    throw new Error(`Login failed: ${error}`);
  }

  const loginData = (await loginResponse.json()) as LoginResponse;
  console.log('Login step 1 successful');

  // Step 2: Exchange login for access token
  const tokenResponse = await fetch(`${MEDPLUM_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: loginData.code!,
      code_verifier: 'xyz',
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const tokenData = (await tokenResponse.json()) as TokenResponse;
  const accessToken = tokenData.access_token;
  console.log('Login successful!\n');

  // Step 3: Get the project ID from /auth/me
  const meResponse = await fetch(`${MEDPLUM_BASE_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const meData = await meResponse.json();

  const projectId = meData.project?.id;

  if (!projectId) {
    throw new Error('Could not determine project ID');
  }
  console.log(`Project ID: ${projectId}`);

  // Step 4: Check if ClientApplication already exists
  console.log('Checking for existing ClientApplication...');
  const searchResponse = await fetch(
    `${MEDPLUM_BASE_URL}/fhir/R4/ClientApplication?name=${encodeURIComponent(clientAppName)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  const searchResult = await searchResponse.json();

  if (searchResult.entry && searchResult.entry.length > 0) {
    const existing = searchResult.entry[0].resource;
    console.log(`Found existing ClientApplication: ${existing.id}, deleting...`);

    await fetch(`${MEDPLUM_BASE_URL}/fhir/R4/ClientApplication/${existing.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    console.log('Deleted existing ClientApplication\n');
  }

  // Step 5: Create ClientApplication using admin API (this generates the secret properly)
  console.log('Creating new ClientApplication via admin API...');

  const createResponse = await fetch(`${MEDPLUM_BASE_URL}/admin/projects/${projectId}/client`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      name: clientAppName,
      description: 'Backend service for EHR sync operations',
    }),
  });

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Failed to create ClientApplication: ${error}`);
  }

  const clientApp = (await createResponse.json()) as ClientApplicationResponse;
  console.log(`Created ClientApplication: ${clientApp.id}\n`);

  // Output the credentials
  console.log('='.repeat(60));
  console.log('MEDPLUM CLIENT CREDENTIALS');
  console.log('='.repeat(60));
  console.log(`\nAdd these to your docker-compose.yml or .env file:\n`);
  console.log(`MEDPLUM_BASE_URL=${MEDPLUM_BASE_URL}`);
  console.log(`MEDPLUM_CLIENT_ID=${clientApp.id}`);
  console.log(`MEDPLUM_CLIENT_SECRET=${clientApp.secret}`);
  console.log('\n' + '='.repeat(60));

  // Test client credentials authentication
  console.log('\nTesting client credentials authentication...');
  const basicAuth = Buffer.from(`${clientApp.id}:${clientApp.secret}`).toString('base64');

  const testTokenResponse = await fetch(`${MEDPLUM_BASE_URL}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
    }),
  });

  if (testTokenResponse.ok) {
    console.log('Client credentials authentication test: SUCCESS');
  } else {
    const error = await testTokenResponse.text();
    console.log(`Client credentials authentication test: FAILED - ${error}`);
  }

  // Also show as JSON for easy copying
  console.log('\nAs JSON:');
  console.log(
    JSON.stringify(
      {
        baseUrl: MEDPLUM_BASE_URL,
        clientId: clientApp.id,
        clientSecret: clientApp.secret,
      },
      null,
      2
    )
  );
}

setupMedplumClient().catch(console.error);
