import { z } from 'zod';
export const createInvoiceSchema = z.object({
  challanId: z.string().uuid(),
  gstPercent: z.coerce.number().min(0).max(100).optional(),
});
export const paymentStatusSchema = z.object({
  paymentStatus: z.enum(['unpaid', 'partial', 'paid']),
});
