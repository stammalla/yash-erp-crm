import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';
import { resetDb } from '../../test/setup';
import { signToken } from '../../lib/jwt';

const app = createApp();
let salesToken: string, customerId: string, productId: string;

beforeEach(async () => {
  await resetDb();
  const s = await prisma.user.create({ data: { name: 'S', email: 's@erp.local', role: 'sales', passwordHash: await bcrypt.hash('x', 10) } });
  salesToken = signToken({ id: s.id, role: 'sales', email: s.email });
  const c = await prisma.customer.create({ data: { name: 'Acme', mobile: '111', type: 'wholesale' } });
  customerId = c.id;
  const p = await prisma.product.create({ data: { name: 'Widget', sku: 'W-1', unitPrice: 20, currentStock: 30, minStockQty: 5 } });
  productId = p.id;
});
afterAll(async () => { await prisma.$disconnect(); });

const auth = () => ({ Authorization: `Bearer ${salesToken}` });

test('creates a draft challan with product snapshot and auto number', async () => {
  const res = await request(app).post('/challans').set(auth())
    .send({ customerId, items: [{ productId, quantity: 5 }] });
  expect(res.status).toBe(201);
  expect(res.body.challanNumber).toMatch(/^CHN-/);
  expect(res.body.status).toBe('draft');
  expect(res.body.items[0].productName).toBe('Widget');
  expect(res.body.items[0].unitPrice).toBe('20');
});

test('confirming a challan reduces stock and logs OUT movements', async () => {
  const created = await request(app).post('/challans').set(auth()).send({ customerId, items: [{ productId, quantity: 10 }] });
  const res = await request(app).post(`/challans/${created.body.id}/confirm`).set(auth());
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('confirmed');
  const p = await prisma.product.findUnique({ where: { id: productId } });
  expect(p!.currentStock).toBe(20);
  const moves = await prisma.stockMovement.count({ where: { productId, type: 'out' } });
  expect(moves).toBe(1);
});

test('confirm fails with 422 when stock is insufficient', async () => {
  const created = await request(app).post('/challans').set(auth()).send({ customerId, items: [{ productId, quantity: 999 }] });
  const res = await request(app).post(`/challans/${created.body.id}/confirm`).set(auth());
  expect(res.status).toBe(422);
  const p = await prisma.product.findUnique({ where: { id: productId } });
  expect(p!.currentStock).toBe(30);
  const still = await prisma.challan.findUnique({ where: { id: created.body.id } });
  expect(still!.status).toBe('draft');
});
