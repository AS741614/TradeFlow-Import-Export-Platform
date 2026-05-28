This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Governance

This project is governed by four documents:
- `AGENTS.md` — full spec for AI coding agents
- `CLAUDE.md` — mirror of AGENTS.md
- `.cursorrules` — compressed cross-tool summary
- `TESTING.md` — test discipline and conventions

Any AI agent or human contributor must read AGENTS.md before making changes.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Local Database Setup & Schema Management

This project uses PostgreSQL for development data and Drizzle ORM for schema management. Follow these steps to provision and verify the local database:

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
5. **Manage Database Schema**:
   - **Generate Migrations**: Whenever you change the schema files under `src/lib/db/schema/`, generate the SQL migration with:
     ```bash
     npm run db:generate
     ```
   - **Apply Structural Migrations**: Run the Drizzle migrations to update the database tables and columns:
     ```bash
     npm run db:migrate
     ```
   - **Apply Custom Triggers**: Custom SQL triggers for updating `updated_at` columns automatically are stored in `drizzle/triggers/0001_updated_at_triggers.sql`. Run:
     ```bash
     npm run db:apply-triggers
     ```
     > [!IMPORTANT]
     > `drizzle-kit migrate` only handles table and enum structure changes. You must run `npm run db:apply-triggers` separately to apply Postgres triggers. Eventually we may build a proper migration runner that handles both.
   - **View DB (Drizzle Studio)**: To inspect and edit database rows locally via a UI:
     ```bash
     npm run db:studio
     ```
6. **Stop Container**:
   ```bash
   npm run db:down
   ```

## API Routes & Validation (Phase 8a)

This project implements standardized REST API endpoints for operations business entities under `src/app/api/`. These routes utilize Drizzle ORM for database queries and Zod for request body validation.

### User Bootstrapping
User accounts and organization tenants are created dynamically on the first visit to the application `/signup` page. Database seeding with static mock IDs is deprecated.

### API Specifications
- **Format**: All route responses conform to `{ data: T | T[] }` or `{ error: string }`.
- **Status Codes**:
  - `200 OK`: Successful read, update, or deletion.
  - `201 Created`: Successful creation.
  - `400 Bad Request`: Validation failure.
  - `404 Not Found`: Record not found.
  - `413 Payload Too Large`: Payload exceeds record limit (e.g. bulk-import > 1000 rows).
  - `429 Too Many Requests`: Rate limit exceeded.
  - `500 Server Error`: Database or execution error.
- **Operations Routes (Phase 8a)**:
  - `/api/contacts` / `/api/contacts/[id]`
  - `/api/products` / `/api/products/[id]`
  - `/api/compliance` / `/api/compliance/[id]`
  - `/api/shipments` / `/api/shipments/[id]` (handles nested products and documents relations)
  - `/api/invoices` / `/api/invoices/[id]` (handles nested line items relation)
  - `/api/dashboard/stats`: Returns database-aggregated count metrics and seeds default sample data on fresh accounts.
  - `/api/contacts/bulk-import`: References bulk import endpoint supporting up to 1000 rows per load.

## Storage Layer (Phase 9a)

TradeFlow's storage layer has been migrated from local-first `localStorage` to API-backed PostgreSQL. 

All reads and writes in the application now go through `src/lib/storage.ts` using the thin, async fetch client `src/lib/api-client.ts`.

- **Asynchronous Signatures**: Every CRUD helper in `storage.ts` returns a `Promise`.
- **Error Handling**: Network and HTTP status code exceptions are standardly wrapped and thrown as `StorageError`.
- **Environment Base URL**: Server-side contexts resolve base URLs using `NEXT_PUBLIC_BASE_URL` (absolute URL), while client components use relative endpoints.
- **LocalStorage Deprecation**: Browser-level `localStorage` references have been completely removed from the runtime codebase.
- **App Metadata Persistence**: Single-value app configurations (like `bp_last_saved` timestamp) are persisted in the `app_metadata` PostgreSQL table via `GET/PUT/DELETE /api/app-metadata/[key]`, with JSON serialization for type safety.

## Authentication & Rate Limiting (Phase 10b / Phase 11)

TradeFlow integrates Auth.js v5 (NextAuth.js) with database-backed sessions.

- **Login Methods**: Credentials (email & password) and Google OAuth.
- **Middleware Protection**: All UI routes are protected. Unauthenticated users are redirected to `/login`.
- **First-time Registration Lock**: User registration via `/signup` is locked automatically after the first user (the Organization Owner) is created.
- **API Security**: Every API route is secured using session-derived authentication (`throwIfNotAuthenticated()`). Unauthenticated requests to API routes are rejected with a `401 Unauthorized` response.
- **Rate Limiting**: Public endpoints enforce in-memory token bucket limits to prevent brute-force attacks:
  - **Signup Action**: 3 registration attempts per hour.
  - **Sign-in Endpoint**: 5 credential validation attempts per 15 minutes per client IP.
  - Returns `429 Too Many Requests` with a standard `Retry-After` header indicating delay in seconds. (Redis-backed token bucket is scheduled to replace the in-memory store in Prompt 23).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
