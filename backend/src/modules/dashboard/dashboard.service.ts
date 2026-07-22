import { prisma } from '../../lib/prisma';
import { AuthUser } from '../../types/express';

export async function summary(role: AuthUser['role']) {
  const [customerCount, productCount, lowStock, unpaid, recentChallans] = await Promise.all([
    prisma.customer.count(),
    prisma.product.count(),
    prisma.$queryRaw<Array<{ count: bigint }>>`SELECT COUNT(*)::int AS count FROM products WHERE current_stock <= min_stock_qty`,
    prisma.invoice.aggregate({ _sum: { totalAmount: true }, where: { paymentStatus: { in: ['unpaid', 'partial'] } } }),
    prisma.challan.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { customer: { select: { name: true } } } }),
  ]);

  const base = {
    customerCount,
    productCount,
    lowStockCount: Number((lowStock as any)[0]?.count ?? 0),
    unpaidInvoiceTotal: Number(unpaid._sum.totalAmount ?? 0),
    recentChallans,
  };
  return { role, ...base };
}
