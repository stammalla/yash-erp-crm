import { MovementType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { Pagination, paginated } from '../../lib/pagination';

const toEnum = (t: 'in' | 'out'): MovementType => (t === 'in' ? MovementType.in_ : MovementType.out);

export async function listMovements(p: Pagination, productId?: string) {
  const where = productId ? { productId } : {};
  const [data, total] = await Promise.all([
    prisma.stockMovement.findMany({ where, skip: p.skip, take: p.limit, orderBy: { createdAt: 'desc' }, include: { product: { select: { name: true, sku: true } } } }),
    prisma.stockMovement.count({ where }),
  ]);
  return paginated(data, total, p);
}

export async function createMovement(input: { productId: string; quantity: number; type: 'in' | 'out'; reason?: string }, userId: string) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: input.productId } });
    if (!product) throw new AppError(404, 'Product not found');
    const delta = input.type === 'in' ? input.quantity : -input.quantity;
    const newStock = product.currentStock + delta;
    if (newStock < 0) throw new AppError(422, 'Insufficient stock for this movement');
    await tx.product.update({ where: { id: product.id }, data: { currentStock: newStock } });
    return tx.stockMovement.create({
      data: { productId: product.id, quantity: input.quantity, type: toEnum(input.type), reason: input.reason, createdBy: userId },
    });
  });
}
