import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';
import { resetDb } from '../../test/setup';
import { signToken } from '../../lib/jwt';

const app = createApp();
let salesToken: string;
let salesId: string;

beforeEach(async () => {
  await resetDb();
  const u = await prisma.user.create({ data: { name: 'S', email: 's@erp.local', role: 'sales', passwordHash: await bcrypt.hash('x', 10) } });
  salesId = u.id;
  salesToken = signToken({ id: u.id, role: 'sales', email: u.email });
});
afterAll(async () => { await prisma.$disconnect(); });

const auth = () => ({ Authorization: `Bearer ${salesToken}` });

test('creates a customer', async () => {
  const res = await request(app).post('/customers').set(auth())
    .send({ name: 'Acme', mobile: '9990001111', type: 'wholesale' });
  expect(res.status).toBe(201);
  expect(res.body.name).toBe('Acme');
  expect(res.body.status).toBe('lead');
});

test('lists and searches customers with pagination', async () => {
  await prisma.customer.create({ data: { name: 'Alpha', mobile: '111', type: 'retail', createdBy: salesId } });
  await prisma.customer.create({ data: { name: 'Beta', mobile: '222', type: 'retail', createdBy: salesId } });
  const res = await request(app).get('/customers?search=Alph&page=1&limit=10').set(auth());
  expect(res.status).toBe(200);
  expect(res.body.data).toHaveLength(1);
  expect(res.body.meta.total).toBe(1);
});

test('adds a follow-up note and returns detail with notes', async () => {
  const c = await prisma.customer.create({ data: { name: 'Gamma', mobile: '333', type: 'retail', createdBy: salesId } });
  await request(app).post(`/customers/${c.id}/notes`).set(auth()).send({ note: 'called customer' });
  const res = await request(app).get(`/customers/${c.id}`).set(auth());
  expect(res.status).toBe(200);
  expect(res.body.notes).toHaveLength(1);
  expect(res.body.notes[0].note).toBe('called customer');
});
