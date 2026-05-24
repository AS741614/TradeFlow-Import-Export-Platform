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

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

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
    const email = row[mappings.email] || '';
    
    // Skip rows without valid email addresses
    if (!email || !isValidEmail(email)) continue;

    // Get tags from header tags column if present or set empty array
    const tagsIdx = mappings.tags !== undefined ? mappings.tags : -1;
    const rawTags = tagsIdx !== -1 && row[tagsIdx] ? row[tagsIdx].split(';') : [];
    const cleanTags = rawTags.map(t => t.trim()).filter(Boolean);

    const contact: OutreachContact = {
      id: generateId(),
      firstName: row[mappings.firstName] || '',
      lastName: row[mappings.lastName] || '',
      email: email.toLowerCase(),
      company: row[mappings.company] || 'Unknown Company',
      phone: mappings.phone !== undefined ? row[mappings.phone] : undefined,
      country: mappings.country !== undefined ? row[mappings.country] : 'United States',
      tags: cleanTags.length > 0 ? cleanTags : ['imported'],
      source,
      importedAt: now,
      campaignHistory: [],
    };

    contacts.push(contact);
  }

  return contacts;
}

/**
 * Safely parse JSON text and extract contact objects.
 */
export function parseJSONContacts(text: string): OutreachContact[] {
  const now = nowISO();
  try {
    const raw = JSON.parse(text);
    const list = Array.isArray(raw) ? raw : [raw];
    const contacts: OutreachContact[] = [];

    for (const item of list) {
      const email = item.email || item.Email || '';
      if (!email || !isValidEmail(email)) continue;

      const tags = Array.isArray(item.tags)
        ? item.tags
        : typeof item.tags === 'string'
        ? item.tags.split(',').map((t: string) => t.trim())
        : ['imported-json'];

      contacts.push({
        id: generateId(),
        firstName: item.firstName || item.FirstName || item.first_name || '',
        lastName: item.lastName || item.LastName || item.last_name || '',
        email: email.toLowerCase(),
        company: item.company || item.Company || 'Unknown Company',
        phone: item.phone || item.Phone || undefined,
        country: item.country || item.Country || 'United States',
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
