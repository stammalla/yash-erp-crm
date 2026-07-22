import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';
import { resetDb } from '../../test/setup';
import { signToken } from '../../lib/jwt';

const app = createApp();
let wareToken: string, productId: string;

beforeEach(async () => {
  await resetDb();
  const w = await prisma.user.create({ data: { name: 'W', email: 'w@erp.local', role: 'warehouse', passwordHash: await bcrypt.hash('x', 10) } });
  wareToken = signToken({ id: w.id, role: 'warehouse', email: w.email });
  const p = await prisma.product.create({ data: { name: 'Widget', sku: 'W-1', unitPrice: 1, currentStock: 50, minStockQty: 5 } });
  productId = p.id;
});
afterAll(async () => { await prisma.$disconnect(); });

const auth = () => ({ Authorization: `Bearer ${wareToken}` });

test('IN movement increases stock and logs it', async () => {
  const res = await request(app).post('/stock-movements').set(auth())
    .send({ productId, quantity: 10, type: 'in', reason: 'restock' });
  expect(res.status).toBe(201);
  const p = await prisma.product.findUnique({ where: { id: productId } });
  expect(p!.currentStock).toBe(60);
});

test('OUT movement cannot make stock negative', async () => {
  const res = await request(app).post('/stock-movements').set(auth())
    .send({ productId, quantity: 100, type: 'out', reason: 'damage' });
  expect(res.status).toBe(422);
  const p = await prisma.product.findUnique({ where: { id: productId } });
  expect(p!.currentStock).toBe(50);
});
