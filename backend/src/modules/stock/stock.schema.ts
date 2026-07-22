import { z } from 'zod';
export const createMovementSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.coerce.number().int().positive(),
  type: z.enum(['in', 'out']),
  reason: z.string().optional(),
});
