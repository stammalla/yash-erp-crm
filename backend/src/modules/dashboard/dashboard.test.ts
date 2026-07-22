import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';
import { resetDb } from '../../test/setup';
import { signToken } from '../../lib/jwt';

const app = createApp();
let adminToken: string;

beforeEach(async () => {
  await resetDb();
  const a = await prisma.user.create({ data: { name: 'A', email: 'a@erp.local', role: 'admin', passwordHash: await bcrypt.hash('x', 10) } });
  adminToken = signToken({ id: a.id, role: 'admin', email: a.email });
  await prisma.customer.create({ data: { name: 'C', mobile: '1', type: 'retail' } });
  await prisma.product.create({ data: { name: 'Low', sku: 'L-1', unitPrice: 1, currentStock: 2, minStockQty: 10 } });
});
afterAll(async () => { await prisma.$disconnect(); });

test('admin dashboard returns summary counts', async () => {
  const res = await request(app).get('/dashboard').set('Authorization', `Bearer ${adminToken}`);
  expect(res.status).toBe(200);
  expect(res.body.customerCount).toBe(1);
  expect(res.body.lowStockCount).toBe(1);
  expect(res.body).toHaveProperty('unpaidInvoiceTotal');
});
