import { z } from 'zod';

export const shipmentProductInputSchema = z.object({
  productId: z.string().uuid('Invalid product ID'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
});

export const shipmentDocumentInputSchema = z.object({
  name: z.string().min(1, 'Document name is required'),
  type: z.enum([
    'bill-of-lading',
    'commercial-invoice',
    'packing-list',
    'certificate-of-origin',
    'customs-declaration',
    'insurance',
    'other',
  ]),
  status: z.enum(['pending', 'submitted', 'approved', 'rejected']),
  uploadedAt: z.string().nullable().optional(),
});

export const insertShipmentSchema = z.object({
  reference: z.string().min(1, 'Reference is required'),
  origin: z.string().min(1, 'Origin is required'),
  destination: z.string().min(1, 'Destination is required'),
  carrier: z.string().min(1, 'Carrier is required'),
  status: z.enum(['ordered', 'shipped', 'in-transit', 'customs', 'delivered']),
  estimatedArrival: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Estimated arrival must be a YYYY-MM-DD date string'),
  actualArrival: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Actual arrival must be a YYYY-MM-DD date string').nullable().optional(),
  trackingNumber: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  createdByUserId: z.string().uuid().nullable().optional(),
  products: z.array(shipmentProductInputSchema).default([]),
  documents: z.array(shipmentDocumentInputSchema).default([]),
});

export const updateShipmentSchema = insertShipmentSchema.partial().omit({
  createdByUserId: true,
});

export type InsertShipmentInput = z.infer<typeof insertShipmentSchema>;
export type UpdateShipmentInput = z.infer<typeof updateShipmentSchema>;
