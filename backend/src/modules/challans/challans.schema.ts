import { z } from 'zod';
export const createChallanSchema = z.object({
  customerId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.coerce.number().int().positive(),
  })).min(1),
});
export const updateChallanSchema = createChallanSchema.partial();
