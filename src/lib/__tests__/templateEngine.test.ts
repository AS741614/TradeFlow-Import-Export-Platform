import { describe, it, expect } from 'vitest';
import { extractVariables, renderTemplate } from '../templateEngine';
import type { OutreachContact } from '../types';

describe('extractVariables', () => {
  it('should extract variables in standard curly braces format', () => {
    const text = 'Hello {{first_name}}, please check {{company}} data.';
    const vars = extractVariables(text);
    expect(vars).toEqual(['first_name', 'company']);
  });

  it('should filter duplicates and return unique variables', () => {
    const text = 'Hello {{first_name}}, is your name {{first_name}}?';
    const vars = extractVariables(text);
    expect(vars).toEqual(['first_name']);
  });

  it('should return empty array when no variables are present', () => {
    const text = 'Hello Partner, please check your company data.';
    const vars = extractVariables(text);
    expect(vars).toEqual([]);
  });

  it('should not extract variables containing spaces due to regex design', () => {
    // Variable extraction regex is /\{\{([a-zA-Z0-9_]+)\}\}/g which does not support spaces inside braces
    const text = 'Hello {{ first_name }}, how are you?';
    const vars = extractVariables(text);
    expect(vars).toEqual([]);
  });
});

describe('renderTemplate', () => {
  const mockContact: OutreachContact = {
    id: 'contact_1',
    firstName: 'Alice',
    lastName: 'Smith',
    email: 'alice@example.com',
    company: 'Acme Corp',
    phone: '+15550199',
    country: 'Canada',
    tags: ['lead'],
    source: 'manual',
    importedAt: '2026-05-25T12:00:00Z',
    campaignHistory: [],
  };

  it('should replace core contact properties with matching fields', () => {
    const template = 'Dear {{first_name}} {{last_name}}, email: {{email}} at {{company}} ({{phone}}) in {{country}}.';
    const rendered = renderTemplate(template, mockContact);
    expect(rendered).toBe('Dear Alice Smith, email: alice@example.com at Acme Corp (+15550199) in Canada.');
  });

  it('should fall back to defaults when contact fields are missing', () => {
    const emptyContact: OutreachContact = {
      id: 'contact_2',
      firstName: '',
      lastName: '',
      email: '',
      company: '',
      phone: undefined,
      country: '',
      tags: [],
      source: 'csv',
      importedAt: '2026-05-25T12:00:00Z',
      campaignHistory: [],
    };
    const template = 'Dear {{first_name}} {{last_name}}, email: {{email}} at {{company}} ({{phone}}) in {{country}}.';
    const rendered = renderTemplate(template, emptyContact);
    expect(rendered).toBe('Dear Partner , email:  at your company () in your country.');
  });

  it('should replace custom parameters using customVars override', () => {
    const template = 'Hello {{first_name}}, coupon code is {{coupon}} or {{first_name}}.';
    const rendered = renderTemplate(template, mockContact, { coupon: 'PROMO50', first_name: 'CustomAlice' });
    // customVars should overwrite matching contact parameters as well as define new ones
    expect(rendered).toBe('Hello CustomAlice, coupon code is PROMO50 or CustomAlice.');
  });

  it('should handle placeholders ignoring inner spacing', () => {
    const template = 'Hello {{   first_name   }}!';
    const rendered = renderTemplate(template, mockContact);
    expect(rendered).toBe('Hello Alice!');
  });

  it('should perform case-insensitive placeholder replacements', () => {
    const template = 'Hello {{FIRST_NAME}}!';
    const rendered = renderTemplate(template, mockContact);
    expect(rendered).toBe('Hello Alice!');
  });

  it('should strip unmatched placeholders from the output string', () => {
    const template = 'Hello {{first_name}}, your order id {{order_id}} is ready.';
    const rendered = renderTemplate(template, mockContact);
    expect(rendered).toBe('Hello Alice, your order id  is ready.');
  });
});
