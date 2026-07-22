import request from 'supertest';
import express from 'express';
import { signToken } from '../lib/jwt';
import { authenticate } from './authenticate';
import { authorize } from './authorize';
import { errorHandler } from './errorHandler';

process.env.JWT_SECRET = 'test-secret';

function buildApp() {
  const app = express();
  app.get('/me', authenticate, (req, res) => res.json(req.user));
  app.get('/admin', authenticate, authorize(['admin']), (_req, res) => res.json({ ok: true }));
  app.use(errorHandler);
  return app;
}

test('rejects missing token with 401', async () => {
  const res = await request(buildApp()).get('/me');
  expect(res.status).toBe(401);
});

test('accepts a valid token and exposes req.user', async () => {
  const token = signToken({ id: 'u1', role: 'sales', email: 'a@b.c' });
  const res = await request(buildApp()).get('/me').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(res.body.role).toBe('sales');
});

test('authorize blocks wrong role with 403', async () => {
  const token = signToken({ id: 'u1', role: 'sales', email: 'a@b.c' });
  const res = await request(buildApp()).get('/admin').set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(403);
});
