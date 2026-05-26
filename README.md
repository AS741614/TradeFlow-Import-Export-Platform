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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
