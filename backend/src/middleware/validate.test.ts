import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import { validate } from './validate';
import { errorHandler } from './errorHandler';

const schema = z.object({ name: z.string().min(1) });

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post('/x', validate(schema), (req, res) => res.json(req.body));
  app.use(errorHandler);
  return app;
}

test('passes valid body through', async () => {
  const res = await request(buildApp()).post('/x').send({ name: 'ok' });
  expect(res.status).toBe(200);
  expect(res.body.name).toBe('ok');
});

test('rejects invalid body with 400 and field errors', async () => {
  const res = await request(buildApp()).post('/x').send({ name: '' });
  expect(res.status).toBe(400);
  expect(res.body.error).toBe('Validation failed');
  expect(res.body.details).toBeDefined();
});
