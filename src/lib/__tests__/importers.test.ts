import { describe, it, expect, vi } from 'vitest';
import { parseCSV, mapParsedDataToContacts, parseJSONContacts } from '../importers';

describe('parseCSV', () => {
  it('should parse standard comma-separated values correctly', () => {
    const csv = 'first_name,last_name,email\nAlice,Smith,alice@example.com\nBob,Jones,bob@example.com';
    const parsed = parseCSV(csv);
    expect(parsed).toEqual([
      ['first_name', 'last_name', 'email'],
      ['Alice', 'Smith', 'alice@example.com'],
      ['Bob', 'Jones', 'bob@example.com'],
    ]);
  });

  it('should handle escaped quotes containing commas without splitting', () => {
    const csv = 'company,country\n"Acme, Inc.",United States\n"TradeFlow, LLC",Canada';
    const parsed = parseCSV(csv);
    expect(parsed).toEqual([
      ['company', 'country'],
      ['Acme, Inc.', 'United States'],
      ['TradeFlow, LLC', 'Canada'],
    ]);
  });

  it('should ignore trailing empty lines', () => {
    const csv = 'firstName,email\nAlice,alice@example.com\n\n   \n';
    const parsed = parseCSV(csv);
    expect(parsed).toEqual([
      ['firstName', 'email'],
      ['Alice', 'alice@example.com'],
    ]);
  });

  it('should handle both Windows and Unix style line endings uniformly', () => {
    const unixCsv = 'firstName,email\nAlice,alice@example.com\nBob,bob@example.com';
    const windowsCsv = 'firstName,email\r\nAlice,alice@example.com\r\nBob,bob@example.com';
    expect(parseCSV(unixCsv)).toEqual(parseCSV(windowsCsv));
  });
});

describe('mapParsedDataToContacts', () => {
  const headers = ['First Name', 'Last Name', 'Email Address', 'Company Name', 'Phone', 'Country Name', 'Tags'];
  const mappings: Record<string, number> = {
    firstName: 0,
    lastName: 1,
    email: 2,
    company: 3,
    phone: 4,
    country: 5,
    tags: 6,
  };

  it('should map valid row arrays to contact objects based on mapping keys', () => {
    const rows = [['Alice', 'Smith', 'alice@example.com', 'Acme Corp', '+15550199', 'Canada', 'partner;lead']];
    const contacts = mapParsedDataToContacts(headers, rows, mappings, 'csv');
    
    expect(contacts.length).toBe(1);
    const contact = contacts[0];
    expect(contact?.firstName).toBe('Alice');
    expect(contact?.lastName).toBe('Smith');
    expect(contact?.email).toBe('alice@example.com');
    expect(contact?.company).toBe('Acme Corp');
    expect(contact?.phone).toBe('+15550199');
    expect(contact?.country).toBe('Canada');
    expect(contact?.tags).toEqual(['partner', 'lead']);
    expect(contact?.source).toBe('csv');
    expect(typeof contact?.id).toBe('string');
    expect(typeof contact?.importedAt).toBe('string');
  });

  it('should skip row records that do not contain valid email addresses', () => {
    const rows = [
      ['Alice', 'Smith', 'alice@example.com', 'Acme', '+1', 'US', ''],
      ['Bob', 'Jones', 'invalid-email', 'Company', '+2', 'CA', ''],
      ['Charlie', 'Brown', '', 'Company', '+3', 'MX', ''],
    ];
    const contacts = mapParsedDataToContacts(headers, rows, mappings);
    expect(contacts.length).toBe(1);
    expect(contacts[0]?.firstName).toBe('Alice');
  });

  it('should parse semicolon-separated tag strings', () => {
    const rows = [['Alice', 'Smith', 'alice@example.com', 'Acme', '+1', 'US', 'tag-1; tag-2;  tag-3']];
    const contacts = mapParsedDataToContacts(headers, rows, mappings);
    expect(contacts[0]?.tags).toEqual(['tag-1', 'tag-2', 'tag-3']);
  });

  it('should assign default tags list when tags columns are absent', () => {
    const sparseMappings: Record<string, number> = { ...mappings, tags: -1 };
    const rows = [['Alice', 'Smith', 'alice@example.com', 'Acme', '+1', 'US', '']];
    const contacts = mapParsedDataToContacts(headers, rows, sparseMappings);
    expect(contacts[0]?.tags).toEqual(['imported']);
  });

  it('should assign defaults for optional columns company and country', () => {
    const sparseMappings: Record<string, number> = {
      firstName: 0,
      lastName: 1,
      email: 2,
      company: -1,
      phone: -1,
      country: -1,
      tags: -1,
    };
    const rows = [['Alice', 'Smith', 'alice@example.com']];
    const contacts = mapParsedDataToContacts(headers, rows, sparseMappings);
    
    expect(contacts[0]?.company).toBe('Unknown Company');
    expect(contacts[0]?.country).toBe('United States');
    expect(contacts[0]?.phone).toBeUndefined();
  });

  it('should convert contact emails to lowercase', () => {
    const rows = [['Alice', 'Smith', 'ALICE@EXAMPLE.COM', 'Acme', '+1', 'US', '']];
    const contacts = mapParsedDataToContacts(headers, rows, mappings);
    expect(contacts[0]?.email).toBe('alice@example.com');
  });

  it('should handle rows that contain fewer elements than header indices', () => {
    const rows = [['Alice']];
    const contacts = mapParsedDataToContacts(headers, rows, mappings);
    expect(contacts).toEqual([]);
  });

  it('should handle missing mapping keys and missing row index values', () => {
    // 1. Missing mappings.email entirely
    const emptyMappings: Record<string, number> = {};
    const rows1 = [['Alice', 'Smith', 'alice@example.com']];
    expect(mapParsedDataToContacts(headers, rows1, emptyMappings)).toEqual([]);

    // 2. mappings.email is present but row is missing the column (row[email] is undefined)
    const outOfBoundsMappings: Record<string, number> = { email: 5 };
    expect(mapParsedDataToContacts(headers, rows1, outOfBoundsMappings)).toEqual([]);

    // 3. Other mappings are undefined or omitted
    const partialMappings: Record<string, number> = { email: 0 };
    const rows2 = [['alice@example.com']];
    const contacts = mapParsedDataToContacts(['email'], rows2, partialMappings);
    expect(contacts.length).toBe(1);
    const contact = contacts[0];
    expect(contact?.firstName).toBe('');
    expect(contact?.lastName).toBe('');
    expect(contact?.company).toBe('');
    expect(contact?.phone).toBeUndefined();
    expect(contact?.country).toBe('United States');

    // 4. Mappings are defined but out of bounds (row does not contain the indices)
    const outOfBoundsKeys: Record<string, number> = {
      email: 0,
      firstName: 1,
      lastName: 2,
      company: 3,
      phone: 4,
      country: 5,
    };
    const contacts2 = mapParsedDataToContacts(['email'], rows2, outOfBoundsKeys);
    expect(contacts2.length).toBe(1);
    const contact2 = contacts2[0];
    expect(contact2?.firstName).toBe('');
    expect(contact2?.lastName).toBe('');
    expect(contact2?.company).toBe('Unknown Company');
    expect(contact2?.phone).toBeUndefined();
    expect(contact2?.country).toBe('United States');
  });
});

describe('parseJSONContacts', () => {
  it('should parse valid contact object arrays from JSON text', () => {
    const json = JSON.stringify([
      {
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        company: 'Acme Corp',
        phone: '+15550199',
        country: 'Canada',
        tags: ['partner', 'lead'],
      },
    ]);
    const contacts = parseJSONContacts(json);
    expect(contacts.length).toBe(1);
    const contact = contacts[0];
    expect(contact?.firstName).toBe('Alice');
    expect(contact?.lastName).toBe('Smith');
    expect(contact?.email).toBe('alice@example.com');
    expect(contact?.company).toBe('Acme Corp');
    expect(contact?.phone).toBe('+15550199');
    expect(contact?.country).toBe('Canada');
    expect(contact?.tags).toEqual(['partner', 'lead']);
    expect(contact?.source).toBe('json');
  });

  it('should parse single contact objects wrapped as non-array', () => {
    const json = JSON.stringify({
      firstName: 'Bob',
      email: 'bob@example.com',
    });
    const contacts = parseJSONContacts(json);
    expect(contacts.length).toBe(1);
    expect(contacts[0]?.firstName).toBe('Bob');
    expect(contacts[0]?.email).toBe('bob@example.com');
  });

  it('should resolve alternative key cases (firstName, FirstName, first_name)', () => {
    const json1 = JSON.stringify({ first_name: 'Alice', last_name: 'Smith', email: 'alice@example.com' });
    const json2 = JSON.stringify({ FirstName: 'Bob', LastName: 'Jones', Email: 'bob@example.com' });
    
    const contacts1 = parseJSONContacts(json1);
    const contacts2 = parseJSONContacts(json2);
    
    expect(contacts1[0]?.firstName).toBe('Alice');
    expect(contacts1[0]?.lastName).toBe('Smith');
    expect(contacts2[0]?.firstName).toBe('Bob');
    expect(contacts2[0]?.lastName).toBe('Jones');
  });

  it('should filter out records missing valid email properties', () => {
    const json = JSON.stringify([
      { firstName: 'Alice', email: 'alice@example.com' },
      { firstName: 'Bob', email: 'invalid-email' },
      { firstName: 'Charlie' },
      null,
      123,
    ]);
    const contacts = parseJSONContacts(json);
    expect(contacts.length).toBe(1);
    expect(contacts[0]?.firstName).toBe('Alice');
  });

  it('should handle parsed array/comma-separated tags lists', () => {
    const json = JSON.stringify([
      { firstName: 'Alice', email: 'alice@example.com', tags: 'tag-a, tag-b' },
      { firstName: 'Bob', email: 'bob@example.com', tags: ['tag-c', 'tag-d'] },
      { firstName: 'Charlie', email: 'charlie@example.com' },
    ]);
    const contacts = parseJSONContacts(json);
    expect(contacts[0]?.tags).toEqual(['tag-a', 'tag-b']);
    expect(contacts[1]?.tags).toEqual(['tag-c', 'tag-d']);
    expect(contacts[2]?.tags).toEqual(['imported-json']);
  });

  it('should catch parsing exceptions and return empty array gracefully', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { /* no-op */ });
    const contacts = parseJSONContacts('{invalid-json}');
    
    expect(contacts).toEqual([]);
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should handle non-string values for optional and required fields by reverting to defaults', () => {
    const json = JSON.stringify([
      {
        firstName: 123,
        lastName: true,
        email: 'alice@example.com',
        company: 123, // Use 123 to cover company non-string branch
        phone: {},
        country: [],
      },
      {
        email: 456,
      }
    ]);
    const contacts = parseJSONContacts(json);
    expect(contacts.length).toBe(1);
    const contact = contacts[0];
    expect(contact?.firstName).toBe('');
    expect(contact?.lastName).toBe('');
    expect(contact?.company).toBe('Unknown Company');
    expect(contact?.phone).toBeUndefined();
    expect(contact?.country).toBe('United States');
  });

  it('should handle completely missing optional keys', () => {
    const json = JSON.stringify([
      {
        email: 'minimal@example.com',
      }
    ]);
    const contacts = parseJSONContacts(json);
    expect(contacts.length).toBe(1);
    const contact = contacts[0];
    expect(contact?.firstName).toBe('');
    expect(contact?.lastName).toBe('');
    expect(contact?.company).toBe('Unknown Company');
    expect(contact?.phone).toBeUndefined();
    expect(contact?.country).toBe('United States');
  });
});
