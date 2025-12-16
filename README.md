# PlumCare Monorepo

A healthcare provider application built on Medplum with integrations for Athena, Elation, and NextGen EHR systems.

## Quick Start

### Prerequisites

- Node.js 22.18+ or 24.2+
- npm 10.9+
- Docker and Docker Compose

### Installation

```bash
npm install
```

### Development

Start all services with Docker:

```bash
npm run dev:docker
```

This starts:
- **Frontend** at http://localhost:4000
- **Backend** (Medplum API) at http://localhost:3000
- **PostgreSQL** at localhost:5432
- **Redis** at localhost:6379

### First-Time Setup

1. Run `npm run dev:docker`
2. Open http://localhost:4000
3. Register a new account - the first user becomes super admin
4. Create a new project for development

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:docker` | Start all services (frontend, backend, db, redis) |
| `npm run dev` | Start frontend only (for cloud backend) |
| `npm run dev:backend` | Start backend only |
| `npm run dev:db` | Start PostgreSQL only |
| `npm run dev:redis` | Start Redis only |
| `npm run docker:up` | Start all Docker services (detached) |
| `npm run docker:down` | Stop all Docker services |
| `npm run docker:logs` | View Docker logs |
| `npm run docker:reset` | Reset all data and restart |
| `npm run build` | Production build |
| `npm run test` | Run tests |

## Project Structure

```
plumcare-monorepo/
├── plumcare-frontend/     # React frontend (port 4000)
├── shared/                # Shared types and utilities
├── infra/
│   ├── medplum/           # Medplum server config
│   └── postgres/          # Database init scripts
└── docker-compose.yml     # All services
```

## Architecture

```
localhost:4000 (frontend)     localhost:3000 (backend)
       │                              │
       └──────── API calls ───────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
              PostgreSQL:5432    Redis:6379      Medplum Server
```

## Environment Variables

For Docker development, environment variables are set automatically in docker-compose.yml.

For local frontend development (connecting to cloud):
```bash
# No env needed - defaults to Medplum cloud
npm run dev
```

For local frontend development (connecting to local backend):
```bash
VITE_MEDPLUM_BASE_URL=http://localhost:3000/ npm run dev
```

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
