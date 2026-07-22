import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/AppError';
import { Pagination, paginated } from '../../lib/pagination';

export type CreateCustomerInput = {
  name: string;
  mobile: string;
  email?: string;
  businessName?: string;
  gstNumber?: string;
  type: Prisma.CustomerCreateInput['type'];
  address?: string;
  status?: Prisma.CustomerCreateInput['status'];
  followUpDate?: Date;
};

export async function listCustomers(search: string | undefined, p: Pagination) {
  const where: Prisma.CustomerWhereInput = search
    ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { mobile: { contains: search } }, { businessName: { contains: search, mode: 'insensitive' } }] }
    : {};
  const [data, total] = await Promise.all([
    prisma.customer.findMany({ where, skip: p.skip, take: p.limit, orderBy: { createdAt: 'desc' } }),
    prisma.customer.count({ where }),
  ]);
  return paginated(data, total, p);
}

export async function getCustomer(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { notes: { orderBy: { createdAt: 'desc' } } },
  });
  if (!customer) throw new AppError(404, 'Customer not found');
  return customer;
}

export async function createCustomer(data: CreateCustomerInput, userId: string) {
  return prisma.customer.create({ data: { ...data, creator: { connect: { id: userId } } } });
}

export async function updateCustomer(id: string, data: Prisma.CustomerUpdateInput) {
  await getCustomer(id);
  return prisma.customer.update({ where: { id }, data });
}

export async function addNote(customerId: string, note: string, userId: string) {
  await getCustomer(customerId);
  return prisma.customerNote.create({ data: { customerId, note, createdBy: userId } });
}
