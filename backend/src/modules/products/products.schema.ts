import { z } from 'zod';
export const createProductSchema = z.object({
  name: z.string().min(1),
  sku: z.string().min(1),
  category: z.string().optional(),
  unitPrice: z.coerce.number().nonnegative(),
  currentStock: z.coerce.number().int().nonnegative().optional(),
  minStockQty: z.coerce.number().int().nonnegative().optional(),
  warehouseLocation: z.string().optional(),
});
export const updateProductSchema = createProductSchema.partial().omit({ currentStock: true });
