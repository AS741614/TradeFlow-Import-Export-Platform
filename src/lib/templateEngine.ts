// ============================================================
// TradeFlow — Email Template Engine
// ============================================================

import type { OutreachContact } from './types';

/**
 * Extract all unique variables in the format {{variable_name}} from a template string.
 */
export function extractVariables(text: string): string[] {
  const matches = text.matchAll(/\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g);
  const vars = new Set<string>();
  for (const match of matches) {
    const variableName = match[1];
    if (variableName !== undefined) {
      vars.add(variableName);
    }
  }
  return Array.from(vars);
}

/**
 * Replace placeholders like {{first_name}}, {{company}} in body or subject
 * with actual properties from the contact or general custom replacement variables.
 */
export function renderTemplate(
  templateText: string,
  contact: OutreachContact,
  customVars: Record<string, string> = {}
): string {
  let rendered = templateText;

  // 1. Map core contact details to placeholders
  const map: Record<string, string> = {
    first_name: contact.firstName || 'Partner',
    last_name: contact.lastName || '',
    email: contact.email || '',
    company: contact.company || 'your company',
    phone: contact.phone ?? '',
    country: contact.country || 'your country',
    ...customVars,
  };

  // 2. Perform replacements
  Object.keys(map).forEach((key) => {
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    rendered = rendered.replace(regex, map[key] ?? '');
  });

  // 3. Fallback for any unmatched placeholders (removes them or leaves space)
  rendered = rendered.replace(/\{\{\s*[a-zA-Z0-9_-]+\s*\}\}/g, '');

  return rendered;
}
