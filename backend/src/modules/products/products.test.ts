import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';
import { resetDb } from '../../test/setup';
import { signToken } from '../../lib/jwt';

const app = createApp();
let wareToken: string, salesToken: string;

beforeEach(async () => {
  await resetDb();
  const w = await prisma.user.create({ data: { name: 'W', email: 'w@erp.local', role: 'warehouse', passwordHash: await bcrypt.hash('x', 10) } });
  const s = await prisma.user.create({ data: { name: 'S', email: 's@erp.local', role: 'sales', passwordHash: await bcrypt.hash('x', 10) } });
  wareToken = signToken({ id: w.id, role: 'warehouse', email: w.email });
  salesToken = signToken({ id: s.id, role: 'sales', email: s.email });
});
afterAll(async () => { await prisma.$disconnect(); });

test('warehouse creates a product', async () => {
  const res = await request(app).post('/products').set('Authorization', `Bearer ${wareToken}`)
    .send({ name: 'Widget', sku: 'W-1', unitPrice: 10.5, currentStock: 100, minStockQty: 20 });
  expect(res.status).toBe(201);
  expect(res.body.sku).toBe('W-1');
});

test('sales can list but not create products', async () => {
  const list = await request(app).get('/products').set('Authorization', `Bearer ${salesToken}`);
  expect(list.status).toBe(200);
  const create = await request(app).post('/products').set('Authorization', `Bearer ${salesToken}`).send({ name: 'X', sku: 'X-1', unitPrice: 1 });
  expect(create.status).toBe(403);
});

test('low-stock returns products at or below min qty', async () => {
  await prisma.product.create({ data: { name: 'Low', sku: 'L-1', unitPrice: 1, currentStock: 5, minStockQty: 10 } });
  await prisma.product.create({ data: { name: 'Ok', sku: 'O-1', unitPrice: 1, currentStock: 50, minStockQty: 10 } });
  const res = await request(app).get('/products/low-stock').set('Authorization', `Bearer ${wareToken}`);
  expect(res.status).toBe(200);
  expect(res.body).toHaveLength(1);
  expect(res.body[0].sku).toBe('L-1');
});
