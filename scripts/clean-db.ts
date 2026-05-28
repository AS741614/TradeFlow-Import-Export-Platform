import { Client } from 'pg';
import fs from 'fs';
import path from 'path';

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

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Error: DATABASE_URL is not defined.');
  process.exit(1);
}

async function clean() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Truncating all tables...');
    await client.query(`
      TRUNCATE TABLE 
        deletion_logs, 
        invoice_line_items, 
        invoices, 
        shipment_products, 
        shipment_documents, 
        shipments, 
        compliance_items, 
        contacts, 
        outreach_contacts, 
        email_templates, 
        campaigns, 
        campaign_contacts, 
        swot_items, 
        business_plan_sections, 
        tasks, 
        financial_projections, 
        app_metadata, 
        users, 
        orgs 
      CASCADE;
    `);
    console.log('Database successfully cleaned!');
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('Failed to clean database:', error);
    client.end();
    process.exit(1);
  }
}

void clean();
