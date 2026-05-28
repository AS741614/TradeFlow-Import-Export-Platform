import { z } from 'zod';

export const ISO_4217_CODES = [
  'USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'NZD', 'SGD', 'HKD', 'JPY',
  'CNY', 'CHF', 'AED', 'SAR', 'SEK', 'NOK', 'DKK', 'PLN', 'ZAR', 'BRL', 'MXN'
] as const;

export const currencyEnumSchema = z.enum(ISO_4217_CODES);
