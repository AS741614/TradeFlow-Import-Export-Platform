# Implementation Plan: Authentication & Multi-Tenant Scoping (Prompt 10a)

This plan describes the integration of Auth.js v5 (NextAuth v5) into TradeFlow to support secure Credentials (email/password) and Google OAuth login methods, with database-backed sessions in PostgreSQL.

## User Review Required

### Split Strategy: Prompt 10a and 10b (Approved)
Because replacing `DEFAULT_USER_ID` and `DEFAULT_ORG_ID` across the entire application touches over **40+ route files** and **15+ integration test files**, this task is split into:
- **Prompt 10a (This Prompt)**: Setup NextAuth infrastructure, configure the Drizzle PostgreSQL adapter, design custom `/login` and `/signup` pages, configure middleware, and implement the server session helpers (`getServerSession`, `throwIfNotAuthenticated`). Existing routes will continue using `DEFAULT_*_ID` (marked with TODO comments) but will be fully authenticated under middleware for UI interactions.
- **Prompt 10b**: Replace the `DEFAULT_*` fallbacks in all API routes and migrate the 15+ integration test files to mock authentication sessions.

---

### Adjustment 1: API Route Auth Gap during 10a (Known Temporary State)
- **UI Routes**: Protected by Next.js middleware. Unauthenticated visits redirected to `/login`.
- **API Routes**: Still use `DEFAULT_USER_ID`/`DEFAULT_ORG_ID` internally and do not enforce authentication checks yet. This is a known temporary state during 10a.
- **TODO Comments**: At the top of every API route file, we will add the comment:
  `// TODO(10b): Replace DEFAULT_USER_ID/DEFAULT_ORG_ID with session`
- **Security Implication**: API routes will remain accessible without auth via direct curl/fetch. This is acceptable ONLY because development is on localhost. Prompt 10b **MUST** be executed before public deployment.

---

### Adjustment 2: bcryptjs Hashing
- We will install and use `bcryptjs` (pure JS implementation) instead of native `bcrypt`.
- Cost factor: 12.
- Password minimum length: 12 characters.

---

### Adjustment 3: Session Cookie Configuration
Session cookies in `src/lib/auth.ts` will be configured as:
```typescript
cookies: {
  sessionToken: {
    name: process.env.NODE_ENV === 'production' 
      ? '__Secure-authjs.session-token' 
      : 'authjs.session-token',
    options: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
    },
  },
},
```

---

## Proposed Changes

### Component: Dependencies
We will install the following packages:
- `next-auth@5.0.0-beta.31`
- `@auth/drizzle-adapter@1.11.2`
- `bcryptjs@2.4.3`
- `@types/bcryptjs@2.4.6`

---

### Component: Database Schema

#### [MODIFY] [core.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/schema/core.ts)
Extend the existing `users` table with standard Auth.js fields and credentials column:
```typescript
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }),
  image: varchar('image', { length: 255 }),
  emailVerified: timestamp('email_verified', { withTimezone: true, mode: 'string' }),
  passwordHash: varchar('password_hash', { length: 255 }),
  orgId: uuid('org_id').references(() => orgs.id).notNull(),
  role: userRoleEnum('role').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});
```

#### [NEW] [auth.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/schema/auth.ts)
Declare standard Auth.js tables:
- `accounts`: Link provider accounts (Google OAuth, etc.) to users.
- `sessions`: Store database sessions for revocability.
- `verificationTokens`: Manage verification tokens.

#### [MODIFY] [index.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/db/schema/index.ts)
Export the new auth schema tables:
`export * from './auth';`

---

### Component: Auth.js Config

#### [NEW] [auth.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/auth.ts)
- Configures Credentials provider using `bcryptjs.compare`.
- Configures GoogleProvider.
- Configures `DrizzleAdapter` utilizing pg `getDb()`.
- Session strategy set to `"database"`.
- Cookie options match Adjustment 3.
- Configures custom `/login` page and error boundaries.
- Session callbacks to inject `orgId` and `role` properties into the session user object.

#### [NEW] [auth-server.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/lib/auth-server.ts)
- `getServerSession()`: Retrieves active session details on server side.
- `throwIfNotAuthenticated()`: Utility for API routes throwing `401 Unauthorized` if unauthenticated.

---

### Component: Middleware

#### [NEW] [middleware.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/middleware.ts)
- Intercepts all paths except `api/auth`, `_next/static`, `_next/image`, and `favicon.ico`.
- Redirects unauthenticated users to `/login`.
- Automatically permits authenticated requests to standard pages, and blocks authenticated users from accessing login/signup.

---

### Component: Pages & Client Views

#### [NEW] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/login/page.tsx)
- Login UI presenting credentials form (email + password) and a "Sign in with Google" OAuth button.

#### [NEW] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/signup/page.tsx)
- First-time user signup.
- In the Server Component, queries the `users` table. If count > 0, triggers `redirect('/login')` instantly to lock self-registration.
- Password length validated to be min 12 characters.
- Password hashed with bcryptjs salt cost factor of 12.
- Creates both a new `orgs` row and a matching `users` row in a database transaction, setting user role to `'owner'`.

#### [NEW] [page.tsx](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/auth/error/page.tsx)
- UI displaying NextAuth errors.

---

### Component: Route Handlers

#### [NEW] [route.ts](file:///Users/akashsharma/.gemini/antigravity/scratch/import-export-platform/src/app/api/auth/%5B...nextauth%5D/route.ts)
Exports the dynamic GET/POST endpoints required by NextAuth:
`export { GET, POST } from '@/lib/auth';`

---

## Verification Plan

### Database Migration
1. Run `npm run db:generate`.
2. Inspect the migration SQL file to confirm it adds columns `password_hash`, `email_verified`, `name`, and `image` to `users`, and creates tables `accounts`, `sessions`, and `verification_tokens`.
3. Apply migration using `npm run db:migrate`.

### Automated Tests
- Create unit tests for session utility helpers in `src/lib/__tests__/auth-server.test.ts`.
- Run typecheck `npx tsc --noEmit`.
- Run linting `npm run lint`.
- Rerun existing test suite `npm test` to confirm zero regressions.

### Manual E2E Validation (Dev Server)
- **Scenario A**: Visit `/` unauthenticated -> confirm redirected to `/login`.
- **Scenario B**: Visit `/signup` -> complete form with new credentials -> confirm user+org is created and logged in.
- **Scenario C**: Visit `/signup` again -> confirm instantly redirected to `/login` (self-signup disabled).
- **Scenario D**: Sign out -> confirm redirected to `/login`.
- **Scenario E**: Sign in using credentials -> confirm redirected to dashboard.

## Risk Assessment
- *OAuth Redirect URIs*: Google Console redirect URIs must match NextAuth routing exactly: `http://localhost:3000/api/auth/callback/google`.
- *Password hashes*: Under 10a, credentials log-ins will verify hashes from database; since we block signup after the first user, future users must be created via seed or script until Prompt 11.
