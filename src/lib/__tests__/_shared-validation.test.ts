import { describe, it, expect } from 'vitest';
import { currencyEnumSchema } from '../db/validation/_shared';

describe('Shared Currency Schema Validation', () => {
  it('should pass for valid ISO 4217 currency codes', () => {
    const validCodes = ['USD', 'EUR', 'GBP', 'BRL', 'CAD', 'JPY'];
    for (const code of validCodes) {
      const result = currencyEnumSchema.safeParse(code);
      expect(result.success).toBe(true);
    }
  });

  it('should fail for invalid currency codes', () => {
    const invalidCodes = ['XYZ', '123', 'usd', 'EURO', ''];
    for (const code of invalidCodes) {
      const result = currencyEnumSchema.safeParse(code);
      expect(result.success).toBe(false);
    }
  });
});
