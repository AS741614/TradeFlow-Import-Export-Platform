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

const dbUrl = connectionString;

async function checkConnection() {
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  console.log(`Connecting to database: ${maskedUrl}`);
  const client = new Client({
    connectionString: dbUrl,
  });

  try {
    await client.connect();
    console.log('Successfully connected to the PostgreSQL database!');
    
    const res = await client.query<{ version: string }>('SELECT version();');
    const version = res.rows[0]?.version ?? 'unknown';
    console.log(`Database version: ${version}`);
    
    await client.end();
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Failed to connect to the database:', message);
    process.exit(1);
  }
}

void checkConnection();
