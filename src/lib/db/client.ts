import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import * as schema from './schema';
import { Logger } from 'drizzle-orm/logger';

// Manual lightweight parser for .env.local/env files to support scripts/test runners
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
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.substring(1, val.length - 1);
      }
      process.env[key] = val;
    });
  }
}

loadEnv();

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export let queryHistory: { query: string; params: unknown[] }[] = [];

export function clearQueryHistory() {
  queryHistory = [];
}

class TestQueryLogger implements Logger {
  logQuery(query: string, params: unknown[]): void {
    queryHistory.push({ query, params });
  }
}

export function getDb() {
  if (db) return db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not defined.');
  }

  pool = new Pool({
    connectionString,
    max: 10, // Reused across route handlers, limit to 10 connections
  });

  const isTest = process.env.NODE_ENV === 'test';
  db = drizzle(pool, { 
    schema, 
    logger: isTest ? new TestQueryLogger() : false 
  });
  return db;
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
    db = null;
  }
}
export type Db = typeof db;
export type Schema = typeof schema;
