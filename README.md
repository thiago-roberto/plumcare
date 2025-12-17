# PlumCare Monorepo

A healthcare provider application built on Medplum with integrations for Athena, Elation, and NextGen EHR systems.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      PlumCare Frontend                          │
│                      (localhost:4000)                           │
└──────────────┬────────────────────────────────┬─────────────────┘
               │                                │
        FHIR operations                  Custom operations
        (CRUD, search)                   (sync, AI, write-back)
               │                                │
               ▼                                ▼
┌──────────────────────────┐    ┌─────────────────────────────────┐
│         MEDPLUM          │◄───│       PlumCare Backend          │
│      (FHIR Server)       │    │       (localhost:8000)          │
│     (localhost:3000)     │    │                                 │
│                          │    │  - EHR sync jobs                │
│  - Patients              │    │  - Write-back to EHRs           │
│  - Encounters            │    │  - Custom logic                 │
│  - Tasks                 │    │                                 │
│  - etc.                  │    └────────────────┬────────────────┘
└──────────────────────────┘                     │
                                                 ▼
                              ┌──────────────────────────────────┐
                              │   Athena / Elation / NextGen     │
                              └──────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 22.18+ or 24.2+
- npm 10.9+
- Docker and Docker Compose

### Installation

```bash
npm install
cd plumcare-backend && npm install && cd ..
```

### Development

Start all services with Docker:

```bash
npm run docker:up
```

This starts:
- **Frontend** at http://localhost:4000
- **PlumCare Backend** at http://localhost:8000
- **Medplum Server** at http://localhost:3000
- **PostgreSQL** at localhost:5432
- **Redis** at localhost:6379

## First-Time Setup

### 1. Start Docker Services

```bash
npm run docker:up
```

Wait for all services to be healthy:
```bash
docker compose ps
```

### 2. Register Admin Account

1. Open http://localhost:4000
2. Register a new account (e.g., `admin@example.com` / `medplum_admin`)
3. The first user becomes super admin

### 3. Create Medplum ClientApplication for Backend

The PlumCare Backend needs credentials to communicate with Medplum. Run the setup script:

```bash
cd plumcare-backend
npm run setup:medplum
```

This will:
- Login to Medplum as admin
- Create a ClientApplication with a generated secret
- Output the credentials to add to `docker-compose.yml`

### 4. Update Docker Compose with Credentials

Copy the output credentials and update `docker-compose.yml`:

```yaml
backend:
  environment:
    - MEDPLUM_CLIENT_ID=<your-client-id>
    - MEDPLUM_CLIENT_SECRET=<your-client-secret>
```

### 5. Restart Backend

```bash
docker compose up -d backend --force-recreate
```

### 6. Sync EHR Mock Data (Optional)

To populate Medplum with mock patient data from Athena, Elation, and NextGen:

```bash
# Sync all EHR systems
curl -X POST http://localhost:8000/api/sync/athena
curl -X POST http://localhost:8000/api/sync/elation
curl -X POST http://localhost:8000/api/sync/nextgen
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run docker:up` | Start all Docker services (detached) |
| `npm run docker:down` | Stop all Docker services |
| `npm run docker:logs` | View Docker logs |
| `npm run docker:reset` | Reset all data and restart |
| `npm run dev:docker` | Start all services (attached) |
| `npm run dev` | Start frontend only |
| `npm run build` | Production build |
| `npm run test` | Run tests |

### Backend Scripts

| Command | Description |
|---------|-------------|
| `npm run setup:medplum` | Create Medplum ClientApplication |
| `npm run dev` | Start backend in development mode |
| `npm run build` | Build for production |

## Mock Data Generators & FHIR Transforms

PlumCare includes generators for creating realistic mock EHR data and transforms to convert that data to FHIR R4 format.

### Mock Data Generators

Located in `plumcare-backend/src/generators/`:

#### HL7v2 Message Generator
```typescript
import { generateADT_A01, generateORU_R01, generateHL7v2Messages } from './generators';

// Generate a single ADT A01 (Patient Admit) message
const admitMessage = generateADT_A01();

// Generate a single ORU R01 (Lab Result) message
const labMessage = generateORU_R01();

// Generate multiple HL7v2 messages
const messages = generateHL7v2Messages(10);
```

#### C-CDA Document Generator
```typescript
import { generateCCD, generateDischargeSummary, generateCCDADocuments } from './generators';

// Generate a Continuity of Care Document
const ccd = generateCCD();

// Generate a Discharge Summary
const discharge = generateDischargeSummary();

// Generate multiple C-CDA documents
const documents = generateCCDADocuments(5);
```

#### Athena Health Generator
```typescript
import {
  generateAthenaPatient,
  generateAthenaEncounter,
  generateAthenaVitals,
  generateAthenaLabResult,
  generateCompleteAthenaPatient,
  generateAthenaPatients,
} from './generators';

// Generate a single Athena patient
const patient = generateAthenaPatient();

// Generate complete patient data (with encounters, vitals, labs, problems, allergies, meds)
const completePatient = generateCompleteAthenaPatient();
// Returns: { patient, appointments, encounters, problems, allergies, medications, vitals, labResults }

// Generate multiple patients
const patients = generateAthenaPatients(10);
```

#### Elation Health Generator
```typescript
import {
  generateElationPatient,
  generateElationVisitNote,
  generateCompleteElationPatient,
  generateElationPatients,
} from './generators';

// Generate a single Elation patient
const patient = generateElationPatient();

// Generate complete patient data
const completePatient = generateCompleteElationPatient();
// Returns: { patient, appointments, visitNotes, problems, allergies, medications, labOrders }

// Generate multiple patients
const patients = generateElationPatients(10);
```

#### NextGen Healthcare Generator
```typescript
import {
  generateNextGenPatient,
  generateNextGenEncounter,
  generateCompleteNextGenPatient,
  generateNextGenPatients,
} from './generators';

// Generate a single NextGen patient
const patient = generateNextGenPatient();

// Generate complete patient data
const completePatient = generateCompleteNextGenPatient();
// Returns: { patient, appointments, encounters, problems, allergies, medications, labOrders }

// Generate multiple patients
const patients = generateNextGenPatients(10);
```

### FHIR R4 Transforms

Located in `plumcare-backend/src/transforms/`:

#### HL7v2 to FHIR
```typescript
import { parseHL7v2ToFhir, parseHL7v2ToPatient, parseHL7v2ToEncounter } from './transforms';

// Parse HL7v2 message to FHIR Bundle
const bundle = parseHL7v2ToFhir(hl7v2Message);

// Parse to individual resources
const patient = parseHL7v2ToPatient(hl7v2Message);
const encounter = parseHL7v2ToEncounter(hl7v2Message);
```

#### C-CDA to FHIR
```typescript
import { parseCcdaToFhir, parseCcdaToPatient, parseCcdaToConditions } from './transforms';

// Parse C-CDA document to FHIR Bundle
const bundle = parseCcdaToFhir(ccdaDocument);

// Parse to individual resources
const patient = parseCcdaToPatient(ccdaDocument);
const conditions = parseCcdaToConditions(ccdaDocument);
```

#### Athena to FHIR
```typescript
import { parseAthenaJsonToFhir, parseAthenaPatientToFhir } from './transforms';

// Transform complete Athena patient data to FHIR Bundle
const bundle = parseAthenaJsonToFhir({
  patient: athenaPatient,
  encounters: athenaEncounters,
  problems: athenaProblems,
  allergies: athenaAllergies,
  medications: athenaMedications,
  vitals: athenaVitals,
  labResults: athenaLabResults,
});

// Transform individual patient
const fhirPatient = parseAthenaPatientToFhir(athenaPatient);
```

#### Elation to FHIR
```typescript
import { parseElationJsonToFhir, parseElationPatientToFhir } from './transforms';

// Transform complete Elation patient data to FHIR Bundle
const bundle = parseElationJsonToFhir({
  patient: elationPatient,
  visitNotes: elationVisitNotes,
  problems: elationProblems,
  allergies: elationAllergies,
  medications: elationMedications,
  labOrders: elationLabOrders,
});

// Transform individual patient
const fhirPatient = parseElationPatientToFhir(elationPatient);
```

#### NextGen to FHIR
```typescript
import { parseNextgenJsonToFhir, parseNextGenPatientToFhir } from './transforms';

// Transform complete NextGen patient data to FHIR Bundle
const bundle = parseNextgenJsonToFhir({
  patient: nextgenPatient,
  encounters: nextgenEncounters,
  problems: nextgenProblems,
  allergies: nextgenAllergies,
  medications: nextgenMedications,
  labOrders: nextgenLabOrders,
});

// Transform individual patient
const fhirPatient = parseNextGenPatientToFhir(nextgenPatient);
```

### Sync Mock Data API

Generate and sync mock patient data to Medplum:

```bash
# Generate 5 patients per EHR and sync to Medplum
curl -X POST http://localhost:8000/api/sync/mock-data \
  -H "Content-Type: application/json" \
  -d '{"patientCount": 5, "includeAllData": true}'

# Response:
{
  "success": true,
  "summary": {
    "athena": { "patients": 5, "encounters": 12, "observations": 45, ... },
    "elation": { "patients": 5, "encounters": 10, "observations": 38, ... },
    "nextgen": { "patients": 5, "encounters": 11, "observations": 42, ... }
  },
  "totalResources": 250
}
```

## Project Structure

```
plumcare/
├── plumcare-frontend/        # React frontend (port 4000)
│   └── src/
│       ├── components/       # UI components
│       ├── pages/            # Page components
│       └── services/         # API clients
│
├── plumcare-backend/         # Node.js backend (port 8000)
│   └── src/
│       ├── providers/        # EHR provider implementations
│       │   ├── athena/       # Athena Health integration
│       │   ├── elation/      # Elation Health integration
│       │   └── nextgen/      # NextGen Healthcare integration
│       ├── services/         # Business logic
│       │   ├── medplum.service.ts   # Medplum FHIR client
│       │   ├── sync.service.ts      # EHR sync orchestration
│       │   └── transform.service.ts # EHR-to-FHIR transformation
│       └── routes/           # API endpoints
│
├── shared/                   # Shared types and utilities
│
├── infra/
│   ├── medplum/              # Medplum server config
│   └── postgres/             # Database init scripts
│
└── docker-compose.yml        # All services
```

## API Endpoints

### PlumCare Backend (localhost:8000)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/connections` | GET | Get all EHR connection statuses |
| `/api/connections/:system` | GET | Get specific EHR connection status |
| `/api/patients/:system` | GET | Get patients from EHR system |
| `/api/encounters/:system` | GET | Get encounters from EHR system |
| `/api/sync/:system` | POST | Trigger sync for EHR system |
| `/api/sync/all` | POST | Trigger sync for all EHR systems |
| `/api/sync/mock-data` | POST | Generate mock data and sync to Medplum |
| `/api/sync/events` | GET | Get recent sync events |

### Medplum Server (localhost:3000)

Standard FHIR R4 endpoints. See [Medplum Documentation](https://www.medplum.com/docs/api/fhir).

## Environment Variables

### Docker (Automatic)

Environment variables are configured in `docker-compose.yml`. No manual setup needed.

### Local Development

For running the backend outside Docker:

```bash
# plumcare-backend/.env
PORT=8000
MEDPLUM_BASE_URL=http://localhost:3000
MEDPLUM_CLIENT_ID=<your-client-id>
MEDPLUM_CLIENT_SECRET=<your-client-secret>
USE_MOCKS=true
CORS_ORIGIN=http://localhost:4000
```

## EHR Integration

### Mock Mode (Default)

By default, the backend runs in mock mode (`USE_MOCKS=true`), returning simulated data:

- **Athena**: 5 patients, 5 encounters
- **Elation**: 3 patients, 3 encounters
- **NextGen**: 4 patients, 4 encounters

### Production Mode

Set `USE_MOCKS=false` and configure real EHR credentials:

```bash
# Athena Health
ATHENA_BASE_URL=https://api.preview.platform.athenahealth.com
ATHENA_CLIENT_ID=<your-client-id>
ATHENA_CLIENT_SECRET=<your-client-secret>
ATHENA_PRACTICE_ID=<your-practice-id>

# Elation Health
ELATION_BASE_URL=https://sandbox.elationemr.com/api/2.0
ELATION_CLIENT_ID=<your-client-id>
ELATION_CLIENT_SECRET=<your-client-secret>

# NextGen Healthcare
NEXTGEN_BASE_URL=https://api.nextgen.com/nge/prod/nge-api
NEXTGEN_CLIENT_ID=<your-client-id>
NEXTGEN_CLIENT_SECRET=<your-client-secret>
```

## Troubleshooting

### Backend not starting in Docker

Check if the Medplum healthcheck is passing:
```bash
docker compose ps
docker compose logs medplum
```

### Port already in use

Kill the process using the port:
```bash
lsof -i :8000  # Find process
kill <PID>     # Kill it
```

### Medplum authentication failing

Re-run the setup script to create new credentials:
```bash
cd plumcare-backend
npm run setup:medplum
```

Then update `docker-compose.yml` and restart.

## Features

- EHR integrations with Athena, Elation, and NextGen
- Patient management and demographics
- Visit documentation and encounter charting
- Task creation and assignment
- Appointment scheduling
- Lab orders and results
- Medication ordering (DoseSpot integration)
- Claim creation and billing
- Patient-provider messaging

## About Medplum

[Medplum](https://www.medplum.com/) is an open-source, API-first EHR.

- [Documentation](https://www.medplum.com/docs)
- [React Components](https://storybook.medplum.com/)
- [Discord Community](https://discord.gg/medplum)

## License

Apache 2.0 - See [LICENSE.txt](LICENSE.txt)
