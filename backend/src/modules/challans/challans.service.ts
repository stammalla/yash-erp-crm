import { Prisma, ChallanStatus, MovementType } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { Pagination, paginated } from '../../lib/pagination';
import { docNumber } from '../../lib/sequence';

const withItems = { items: true, customer: { select: { name: true, businessName: true } } };

export async function listChallans(p: Pagination, status?: string) {
  const where: Prisma.ChallanWhereInput = status ? { status: status as ChallanStatus } : {};
  const [data, total] = await Promise.all([
    prisma.challan.findMany({ where, skip: p.skip, take: p.limit, orderBy: { createdAt: 'desc' }, include: withItems }),
    prisma.challan.count({ where }),
  ]);
  return paginated(data, total, p);
}

export async function getChallan(id: string) {
  const challan = await prisma.challan.findUnique({ where: { id }, include: withItems });
  if (!challan) throw new AppError(404, 'Challan not found');
  return challan;
}

export async function createChallan(input: { customerId: string; items: { productId: string; quantity: number }[] }, userId: string) {
  const products = await prisma.product.findMany({ where: { id: { in: input.items.map((i) => i.productId) } } });
  const byId = new Map(products.map((p) => [p.id, p]));
  for (const item of input.items) {
    if (!byId.has(item.productId)) throw new AppError(404, `Product ${item.productId} not found`);
  }
  const count = await prisma.challan.count();
  const totalQuantity = input.items.reduce((s, i) => s + i.quantity, 0);
  return prisma.challan.create({
    data: {
      challanNumber: docNumber('CHN', count + 1),
      customerId: input.customerId,
      createdBy: userId,
      totalQuantity,
      items: {
        create: input.items.map((i) => {
          const p = byId.get(i.productId)!;
          return { productId: p.id, productName: p.name, productSku: p.sku, unitPrice: p.unitPrice, quantity: i.quantity };
        }),
      },
    },
    include: withItems,
  });
}

export async function updateChallan(id: string, input: { customerId?: string; items?: { productId: string; quantity: number }[] }) {
  const challan = await getChallan(id);
  if (challan.status !== 'draft') throw new AppError(409, 'Only draft challans can be edited');
  return prisma.$transaction(async (tx) => {
    if (input.items) {
      await tx.challanItem.deleteMany({ where: { challanId: id } });
      const products = await tx.product.findMany({ where: { id: { in: input.items.map((i) => i.productId) } } });
      const byId = new Map(products.map((p) => [p.id, p]));
      for (const i of input.items) {
        const p = byId.get(i.productId);
        if (!p) throw new AppError(404, `Product ${i.productId} not found`);
        await tx.challanItem.create({ data: { challanId: id, productId: p.id, productName: p.name, productSku: p.sku, unitPrice: p.unitPrice, quantity: i.quantity } });
      }
    }
    return tx.challan.update({
      where: { id },
      data: {
        customerId: input.customerId,
        totalQuantity: input.items ? input.items.reduce((s, i) => s + i.quantity, 0) : undefined,
      },
      include: withItems,
    });
  });
}

export async function confirmChallan(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({ where: { id }, include: { items: true } });
    if (!challan) throw new AppError(404, 'Challan not found');
    if (challan.status !== 'draft') throw new AppError(409, 'Only draft challans can be confirmed');

    const products = await tx.product.findMany({ where: { id: { in: challan.items.map((i) => i.productId) } } });
    const byId = new Map(products.map((p) => [p.id, p]));

    const short = challan.items.filter((i) => (byId.get(i.productId)?.currentStock ?? 0) < i.quantity);
    if (short.length > 0) {
      throw new AppError(422, 'Insufficient stock', short.map((i) => ({ productId: i.productId, productName: i.productName, requested: i.quantity, available: byId.get(i.productId)?.currentStock ?? 0 })));
    }

    for (const item of challan.items) {
      await tx.product.update({ where: { id: item.productId }, data: { currentStock: { decrement: item.quantity } } });
      await tx.stockMovement.create({ data: { productId: item.productId, quantity: item.quantity, type: MovementType.out, reason: `Challan ${challan.challanNumber}`, createdBy: userId } });
    }
    return tx.challan.update({ where: { id }, data: { status: 'confirmed' }, include: withItems });
  });
}

export async function cancelChallan(id: string) {
  const challan = await getChallan(id);
  if (challan.status === 'confirmed') throw new AppError(409, 'Confirmed challans cannot be cancelled');
  return prisma.challan.update({ where: { id }, data: { status: 'cancelled' }, include: withItems });
}
