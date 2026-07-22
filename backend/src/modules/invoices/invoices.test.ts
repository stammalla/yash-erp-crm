import request from 'supertest';
import bcrypt from 'bcryptjs';
import { createApp } from '../../app';
import { prisma } from '../../lib/prisma';
import { resetDb } from '../../test/setup';
import { signToken } from '../../lib/jwt';

const app = createApp();
let acctToken: string, confirmedChallanId: string;

beforeEach(async () => {
  await resetDb();
  const acct = await prisma.user.create({ data: { name: 'Ac', email: 'ac@erp.local', role: 'accounts', passwordHash: await bcrypt.hash('x', 10) } });
  acctToken = signToken({ id: acct.id, role: 'accounts', email: acct.email });
  const cust = await prisma.customer.create({ data: { name: 'Acme', mobile: '111', type: 'wholesale' } });
  const prod = await prisma.product.create({ data: { name: 'Widget', sku: 'W-1', unitPrice: 100, currentStock: 50, minStockQty: 5 } });
  const challan = await prisma.challan.create({
    data: {
      challanNumber: 'CHN-TEST-0001', customerId: cust.id, status: 'confirmed', totalQuantity: 2,
      items: { create: [{ productId: prod.id, productName: 'Widget', productSku: 'W-1', unitPrice: 100, quantity: 2 }] },
    },
  });
  confirmedChallanId = challan.id;
});
afterAll(async () => { await prisma.$disconnect(); });

const auth = () => ({ Authorization: `Bearer ${acctToken}` });

test('creates an invoice from a confirmed challan with GST math', async () => {
  const res = await request(app).post('/invoices').set(auth()).send({ challanId: confirmedChallanId });
  expect(res.status).toBe(201);
  expect(res.body.invoiceNumber).toMatch(/^INV-/);
  expect(res.body.subtotal).toBe('200');
  expect(res.body.gstAmount).toBe('36');
  expect(res.body.totalAmount).toBe('236');
});

test('rejects invoicing a non-confirmed challan', async () => {
  const draft = await prisma.challan.create({ data: { challanNumber: 'CHN-D-1', customerId: (await prisma.customer.findFirst())!.id, status: 'draft', totalQuantity: 0 } });
  const res = await request(app).post('/invoices').set(auth()).send({ challanId: draft.id });
  expect(res.status).toBe(422);
});

test('returns a PDF for an invoice', async () => {
  const created = await request(app).post('/invoices').set(auth()).send({ challanId: confirmedChallanId });
  const res = await request(app).get(`/invoices/${created.body.id}/pdf`).set(auth());
  expect(res.status).toBe(200);
  expect(res.headers['content-type']).toBe('application/pdf');
});
