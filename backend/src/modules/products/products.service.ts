import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { Pagination, paginated } from '../../lib/pagination';

export interface CreateProductInput { name: string; sku: string; category?: string; unitPrice: number; currentStock?: number; minStockQty?: number; warehouseLocation?: string; }
export type UpdateProductInput = Partial<Omit<CreateProductInput, 'currentStock'>> & { imageUrl?: string };

export async function listProducts(search: string | undefined, p: Pagination) {
  const where: Prisma.ProductWhereInput = search
    ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }] }
    : {};
  const [data, total] = await Promise.all([
    prisma.product.findMany({ where, skip: p.skip, take: p.limit, orderBy: { createdAt: 'desc' } }),
    prisma.product.count({ where }),
  ]);
  return paginated(data, total, p);
}

export async function lowStock() {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM products WHERE current_stock <= min_stock_qty ORDER BY current_stock ASC`;
  const ids = rows.map((r) => r.id);
  return prisma.product.findMany({ where: { id: { in: ids } }, orderBy: { currentStock: 'asc' } });
}

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new AppError(404, 'Product not found');
  return product;
}

export async function createProduct(data: CreateProductInput, userId: string) {
  const exists = await prisma.product.findUnique({ where: { sku: data.sku } });
  if (exists) throw new AppError(409, 'SKU already exists');
  return prisma.product.create({ data: { ...data, createdBy: userId } });
}

export async function updateProduct(id: string, data: UpdateProductInput) {
  await getProduct(id);
  return prisma.product.update({ where: { id }, data });
}
