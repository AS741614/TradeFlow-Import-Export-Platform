// ============================================================
// TradeFlow — Contact Importers
// ============================================================

import { generateId, nowISO, isValidEmail } from './utils';
import type { OutreachContact, OutreachSource } from './types';

/**
 * Basic CSV Parser.
 * Splits on newlines for rows and commas/tabs for columns.
 * Supports basic double quotes escaping.
 */
export function parseCSV(text: string): string[][] {
  const lines = text.split(/\r?\n/);
  const result: string[][] = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    
    const row: string[] = [];
    let inQuotes = false;
    let currentToken = '';

    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row.push(currentToken.trim());
        currentToken = '';
      } else {
        currentToken += char;
      }
    }
    row.push(currentToken.trim());
    result.push(row);
  }

  return result;
}

/**
 * Maps raw rows of parsed CSV data to OutreachContact objects using column indexes.
 */
export function mapParsedDataToContacts(
  headers: string[],
  rows: string[][],
  mappings: Record<string, number>, // keys: firstName, lastName, email, company, phone, country
  source: OutreachSource = 'csv'
): OutreachContact[] {
  const contacts: OutreachContact[] = [];
  const now = nowISO();

  for (const row of rows) {
    const emailIdx = mappings.email;
    const email = (emailIdx !== undefined ? row[emailIdx] : '') ?? '';
    
    // Skip rows without valid email addresses
    if (!email || !isValidEmail(email)) continue;

    // Get tags from header tags column if present or set empty array
    const tagsIdx = mappings.tags;
    const rawTags = (tagsIdx !== undefined && row[tagsIdx]) ? row[tagsIdx].split(';') : [];
    const cleanTags = rawTags.map(t => t.trim()).filter(Boolean);

    const firstNameIdx = mappings.firstName;
    const lastNameIdx = mappings.lastName;
    const companyIdx = mappings.company;
    const phoneIdx = mappings.phone;
    const countryIdx = mappings.country;

    const contact: OutreachContact = {
      id: generateId(),
      firstName: (firstNameIdx !== undefined ? row[firstNameIdx] : '') ?? '',
      lastName: (lastNameIdx !== undefined ? row[lastNameIdx] : '') ?? '',
      email: email.toLowerCase(),
      company: (companyIdx !== undefined ? row[companyIdx] : '') ?? 'Unknown Company',
      phone: phoneIdx !== undefined ? row[phoneIdx] : undefined,
      country: (countryIdx !== undefined ? row[countryIdx] : undefined) ?? 'United States',
      tags: cleanTags.length > 0 ? cleanTags : ['imported'],
      source,
      importedAt: now,
      campaignHistory: [],
    };

    contacts.push(contact);
  }

  return contacts;
}

interface RawContactItem {
  firstName?: unknown;
  FirstName?: unknown;
  first_name?: unknown;
  lastName?: unknown;
  LastName?: unknown;
  last_name?: unknown;
  email?: unknown;
  Email?: unknown;
  company?: unknown;
  Company?: unknown;
  phone?: unknown;
  Phone?: unknown;
  country?: unknown;
  Country?: unknown;
  tags?: unknown;
}

/**
 * Safely parse JSON text and extract contact objects.
 */
export function parseJSONContacts(text: string): OutreachContact[] {
  const now = nowISO();
  try {
    const raw = JSON.parse(text) as unknown;
    const list = Array.isArray(raw) ? (raw as unknown[]) : [raw];
    const contacts: OutreachContact[] = [];

    for (const rawItem of list) {
      if (!rawItem || typeof rawItem !== 'object') continue;
      const item = rawItem as RawContactItem;

      const emailRaw = item.email ?? item.Email ?? '';
      const email = typeof emailRaw === 'string' ? emailRaw : '';
      if (!email || !isValidEmail(email)) continue;

      let tags: string[] = ['imported-json'];
      if (Array.isArray(item.tags)) {
        tags = item.tags.map((t) => String(t));
      } else if (typeof item.tags === 'string') {
        tags = item.tags.split(',').map((t) => t.trim());
      }

      const firstNameRaw = item.firstName ?? item.FirstName ?? item.first_name ?? '';
      const firstName = typeof firstNameRaw === 'string' ? firstNameRaw : '';

      const lastNameRaw = item.lastName ?? item.LastName ?? item.last_name ?? '';
      const lastName = typeof lastNameRaw === 'string' ? lastNameRaw : '';

      const companyRaw = item.company ?? item.Company ?? 'Unknown Company';
      const company = typeof companyRaw === 'string' ? companyRaw : 'Unknown Company';

      const phoneRaw = item.phone ?? item.Phone ?? undefined;
      const phone = typeof phoneRaw === 'string' ? phoneRaw : undefined;

      const countryRaw = item.country ?? item.Country ?? 'United States';
      const country = typeof countryRaw === 'string' ? countryRaw : 'United States';

      contacts.push({
        id: generateId(),
        firstName,
        lastName,
        email: email.toLowerCase(),
        company,
        phone,
        country,
        tags: tags.filter(Boolean),
        source: 'json',
        importedAt: now,
        campaignHistory: [],
      });
    }

    return contacts;
  } catch (e) {
    console.error('Failed to parse JSON contacts', e);
    return [];
  }
}
