import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server';

const app = createApp();

describe('GET /api/audit', () => {
  it('returns an array of audit entries', async () => {
    const res = await request(app).get('/api/audit');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('respects the limit query param', async () => {
    const res = await request(app).get('/api/audit?limit=3');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(3);
  });
});

describe('GET /api/plans', () => {
  it('returns an array of plans for a family', async () => {
    const res = await request(app).get('/api/plans?familyId=family-1');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('GET /api/family/members', () => {
  it('returns the seeded family members', async () => {
    const res = await request(app).get('/api/family/members');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    // The seed file creates the Hearth family — 2 parents + 2 children
    if (res.body.length > 0) {
      const names = res.body.map((m: { name: string }) => m.name);
      expect(names.some((n: string) => n.includes('Hearth'))).toBe(true);
    }
  });
});
