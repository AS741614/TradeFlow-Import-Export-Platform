# Implementation Plan — Phase 6: Local PostgreSQL Database Infrastructure

This plan defines the steps to provision local PostgreSQL database infrastructure via Docker Compose and prepare the ORM config/scripts for the backend migration.

## User Review Required

> [!IMPORTANT]
> - **Port 5432 is confirmed FREE** on the host machine. We will use the default port `5432` mapped to `5432`.
> - **No application code changes** are made in this prompt. Components and storage logic remain strictly on `localStorage` using `storage.ts`.
> - All connection details are kept local in `.env.local` (which is gitignored).

---

## Proposed Changes

We will introduce Docker Compose configurations, drizzle configs, and package dependencies.

### 1. [NEW] [docker-compose.yml](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/docker-compose.yml)
Defines the local PostgreSQL 16 container, container name `tradeflow-postgres`, mapping port 5432, named volume persistence, and startup healthchecks.

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: tradeflow-postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-dev_user}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-dev_password_change_me}
      POSTGRES_DB: ${POSTGRES_DB:-tradeflow_dev}
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER:-dev_user} -d $${POSTGRES_DB:-tradeflow_dev}"]
      interval: 5s
      timeout: 5s
      retries: 5
      start_period: 2s

volumes:
  postgres-data:
    name: tradeflow-postgres-data
```

### 2. [NEW] [.env.example](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/.env.example)
Template config file for local connection details.

```env
# Local Database Configuration
POSTGRES_USER=dev_user
POSTGRES_PASSWORD=dev_password_change_me
POSTGRES_DB=tradeflow_dev
POSTGRES_PORT=5432

# Connection URL for Drizzle ORM
DATABASE_URL=postgres://dev_user:dev_password_change_me@localhost:5432/tradeflow_dev
```

### 3. [NEW] [scripts/db-check.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/scripts/db-check.ts)
A standalone connection check script that parses `.env.local` manually without external package dependencies and tests database availability.

```typescript
import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

// Manual lightweight parser for .env.local/env files to avoid external dependencies
function loadEnv() {
  const envLocalPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const index = trimmed.indexOf('=');
      if (index === -1) return;
      const key = trimmed.substring(0, index).trim();
      let val = trimmed.substring(index + 1).trim();
      // Remove optional quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    });
  } else {
    console.warn('Warning: .env.local file not found. Copy .env.example to .env.local and customize it.');
  }
}

loadEnv();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Error: DATABASE_URL environment variable is not defined.');
  console.error('Please ensure .env.local exists and contains a valid DATABASE_URL.');
  process.exit(1);
}

async function checkConnection() {
  const maskedUrl = connectionString.replace(/:([^:@]+)@/, ':****@');
  console.log(`Connecting to database: ${maskedUrl}`);
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('Successfully connected to the PostgreSQL database!');
    
    const res = await client.query('SELECT version();');
    console.log(`Database version: ${res.rows[0].version}`);
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
}

checkConnection();
```

### 4. [NEW] [drizzle.config.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/drizzle.config.ts)
A Drizzle-kit configuration stub referencing the future schema path.

```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgres://dev_user:dev_password_change_me@localhost:5432/tradeflow_dev',
  },
});
```

---

### 5. [MODIFY] [package.json](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/package.json)
We will add new devDependencies, dependencies, and DB management scripts:

```diff
   "scripts": {
     "dev": "next dev",
     "build": "next build",
     "start": "next start",
     "lint": "eslint .",
     "lint:fix": "eslint . --fix",
     "test": "vitest run",
     "test:watch": "vitest",
     "test:ui": "vitest --ui",
-    "test:coverage": "vitest run --coverage"
+    "test:coverage": "vitest run --coverage",
+    "db:up": "docker compose up -d postgres",
+    "db:down": "docker compose down",
+    "db:check": "tsx scripts/db-check.ts",
+    "db:logs": "docker compose logs -f postgres"
   },
   "dependencies": {
     "next": "16.2.6",
     "react": "19.2.4",
-    "react-dom": "19.2.4"
+    "react-dom": "19.2.4",
+    "drizzle-orm": "0.38.4",
+    "pg": "8.13.1"
   },
   "devDependencies": {
     "@eslint/eslintrc": "^3.2.0",
     "@eslint/js": "^9.21.0",
     "@testing-library/jest-dom": "^6.9.1",
     "@testing-library/react": "^16.3.2",
     "@types/node": "^20",
+    "@types/pg": "8.11.10",
     "@types/react": "^19",
     "@types/react-dom": "^19",
     "@vitest/coverage-v8": "^3.0.7",
+    "drizzle-kit": "0.30.1",
     "eslint": "^9.21.0",
     "eslint-config-next": "^16.2.6",
     "eslint-plugin-jsx-a11y": "^6.10.2",
     "jsdom": "^26.0.0",
     "typescript": "^5",
     "typescript-eslint": "^8.59.4",
-    "vitest": "^3.0.7"
+    "vitest": "^3.0.7",
+    "tsx": "4.19.1"
   },
```

---

### 6. [MODIFY] [.gitignore](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/.gitignore)
Explicitly ensures `.env.local` is ignored:

```diff
 # env files (can opt-in for committing if needed)
 .env*
+.env.local
```

---

### 7. [MODIFY] [README.md](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/README.md)
Appends onboarding setup instructions for database infrastructure:

```markdown
## Local Database Setup

This project uses PostgreSQL for development data. Follow these steps to provision and verify the local database:

1. **Prerequisites**: Make sure Docker Desktop is installed and running.
2. **Setup Local Env**: Copy the env template file to your local configuration:
   ```bash
   cp .env.example .env.local
   ```
3. **Start Postgres Container**:
   ```bash
   npm run db:up
   ```
   This pulls the `postgres:16-alpine` image and spins up the container named `tradeflow-postgres` on port `5432`.
4. **Verify Connectivity**:
   ```bash
   npm run db:check
   ```
   This script runs a test connection using the `DATABASE_URL` in `.env.local`.
5. **Stop Container**:
   ```bash
   npm run db:down
   ```
```

---

### 8. [MODIFY] [AGENTS.md](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/AGENTS.md)
Adds pointer for local DB variables in Section 11:

```diff
 ## Section 11: Related Documents
 - `TESTING.md` — Testing philosophies, Vitest/Playwright conventions, and localStorage mock setups.
 - `.cursorrules` — Compressed workspace instructions for Cursor IDE.
 - `README.md` — Developer onboarding overview.
+- `.env.example` — Template defining local PostgreSQL environment variables.
```

---

## Verification Plan

### Automated Checks
We will run:
- `npx tsc --noEmit`
- `npm run lint` & `npx eslint .`
- `npm run test:coverage` (ensure 105 tests still pass, utils remains 100%)
- `npm run build`

### Infrastructure Integration Checks
We will perform the following manual validation sequence:
1. Run `npm run db:up` to start the PostgreSQL container.
2. Run `docker ps` to verify `tradeflow-postgres` is up and status is healthy.
3. Create `.env.local` by copying `.env.example`.
4. Run `npm run db:check` to confirm the connection succeeds and returns the PostgreSQL version.
5. Create a test table, stop/start the container, and verify table persistence:
   - Run: `docker exec -i tradeflow-postgres psql -U dev_user -d tradeflow_dev -c "CREATE TABLE test_persist (id serial PRIMARY KEY, val text); INSERT INTO test_persist (val) VALUES ('persisted');"`
   - Run `npm run db:down`
   - Run `npm run db:up`
   - Run: `docker exec -i tradeflow-postgres psql -U dev_user -d tradeflow_dev -c "SELECT * FROM test_persist;"` (Verify row is printed)
6. Clean up the test table:
   - Run: `docker exec -i tradeflow-postgres psql -U dev_user -d tradeflow_dev -c "DROP TABLE test_persist;"`
7. Run `npm run db:down` to cleanly teardown the container.
