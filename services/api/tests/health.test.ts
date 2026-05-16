import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server';

describe('GET /api/health', () => {
  it('returns 200 with service identification', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', service: 'hearthos-api' });
  });

  it('returns JSON', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
