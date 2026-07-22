import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';
import { resetDb } from '../../test/setup';
import { signToken } from '../../lib/jwt';

const app = createApp();
let adminToken: string;
let salesToken: string;

beforeEach(async () => {
  await resetDb();
  const admin = await prisma.user.create({ data: { name: 'A', email: 'a@erp.local', role: 'admin', passwordHash: await bcrypt.hash('x', 10) } });
  const sales = await prisma.user.create({ data: { name: 'S', email: 's@erp.local', role: 'sales', passwordHash: await bcrypt.hash('x', 10) } });
  adminToken = signToken({ id: admin.id, role: 'admin', email: admin.email });
  salesToken = signToken({ id: sales.id, role: 'sales', email: sales.email });
});
afterAll(async () => { await prisma.$disconnect(); });

test('admin can create a user', async () => {
  const res = await request(app).post('/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'W', email: 'w@erp.local', password: 'Ware@123', role: 'warehouse' });
  expect(res.status).toBe(201);
  expect(res.body.email).toBe('w@erp.local');
  expect(res.body.passwordHash).toBeUndefined();
});

test('non-admin cannot list users', async () => {
  const res = await request(app).get('/users').set('Authorization', `Bearer ${salesToken}`);
  expect(res.status).toBe(403);
});
