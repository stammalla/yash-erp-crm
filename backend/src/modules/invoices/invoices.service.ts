import { Prisma, PaymentStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { Pagination, paginated } from '../../lib/pagination';
import { docNumber } from '../../lib/sequence';

const include = { challan: { include: { items: true } }, customer: true };

export async function listInvoices(p: Pagination, paymentStatus?: string) {
  const where: Prisma.InvoiceWhereInput = paymentStatus ? { paymentStatus: paymentStatus as PaymentStatus } : {};
  const [data, total] = await Promise.all([
    prisma.invoice.findMany({ where, skip: p.skip, take: p.limit, orderBy: { createdAt: 'desc' }, include: { customer: { select: { name: true } } } }),
    prisma.invoice.count({ where }),
  ]);
  return paginated(data, total, p);
}

export async function getInvoice(id: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id }, include });
  if (!invoice) throw new AppError(404, 'Invoice not found');
  return invoice;
}

export async function createInvoice(input: { challanId: string; gstPercent?: number }, userId: string) {
  const challan = await prisma.challan.findUnique({ where: { id: input.challanId }, include: { items: true } });
  if (!challan) throw new AppError(404, 'Challan not found');
  if (challan.status !== 'confirmed') throw new AppError(422, 'Only confirmed challans can be invoiced');
  const existing = await prisma.invoice.findUnique({ where: { challanId: challan.id } });
  if (existing) throw new AppError(409, 'Invoice already exists for this challan');

  const subtotal = challan.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);
  const gstPercent = input.gstPercent ?? 18;
  const gstAmount = (subtotal * gstPercent) / 100;
  const totalAmount = subtotal + gstAmount;
  const count = await prisma.invoice.count();

  return prisma.invoice.create({
    data: {
      invoiceNumber: docNumber('INV', count + 1),
      challanId: challan.id,
      customerId: challan.customerId,
      subtotal, gstPercent, gstAmount, totalAmount,
      createdBy: userId,
    },
  });
}

export async function updatePaymentStatus(id: string, paymentStatus: PaymentStatus) {
  await getInvoice(id);
  return prisma.invoice.update({ where: { id }, data: { paymentStatus } });
}
