import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';
import { resetDb } from '../../test/setup';

const app = createApp();

beforeEach(async () => {
  await resetDb();
  await prisma.user.create({
    data: { name: 'Admin', email: 'admin@erp.local', role: 'admin', passwordHash: await bcrypt.hash('Admin@123', 10) },
  });
});
afterAll(async () => { await prisma.$disconnect(); });

test('login returns a token and user for valid credentials', async () => {
  const res = await request(app).post('/auth/login').send({ email: 'admin@erp.local', password: 'Admin@123' });
  expect(res.status).toBe(200);
  expect(res.body.token).toBeDefined();
  expect(res.body.user.role).toBe('admin');
});

test('login rejects wrong password with 401', async () => {
  const res = await request(app).post('/auth/login').send({ email: 'admin@erp.local', password: 'nope' });
  expect(res.status).toBe(401);
});
