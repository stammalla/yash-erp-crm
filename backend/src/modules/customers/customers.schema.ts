import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1),
  mobile: z.string().min(5),
  email: z.string().email().optional(),
  businessName: z.string().optional(),
  gstNumber: z.string().optional(),
  type: z.enum(['retail', 'wholesale', 'distributor']),
  address: z.string().optional(),
  status: z.enum(['lead', 'active', 'inactive']).optional(),
  followUpDate: z.coerce.date().optional(),
});

export const updateCustomerSchema = createCustomerSchema.partial();
export const noteSchema = z.object({ note: z.string().min(1) });
