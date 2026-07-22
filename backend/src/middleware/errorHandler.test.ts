import request from 'supertest';
import express from 'express';
import { AppError } from '../lib/AppError';
import { errorHandler } from './errorHandler';

function buildApp() {
  const app = express();
  app.get('/boom', () => { throw new AppError(422, 'bad thing', { field: 'x' }); });
  app.get('/unknown', () => { throw new Error('surprise'); });
  app.use(errorHandler);
  return app;
}

test('maps AppError to its status and payload', async () => {
  const res = await request(buildApp()).get('/boom');
  expect(res.status).toBe(422);
  expect(res.body).toEqual({ error: 'bad thing', details: { field: 'x' } });
});

test('maps unknown errors to 500', async () => {
  const res = await request(buildApp()).get('/unknown');
  expect(res.status).toBe(500);
  expect(res.body.error).toBe('Internal server error');
});
