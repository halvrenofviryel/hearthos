import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server';
import { prisma } from '../src/prisma';

const app = createApp();

beforeAll(async () => {
  // Tests assume the seed has been applied; if dev.db has no agents,
  // these will fail and the operator should run `pnpm db:seed`.
  const count = await prisma.staffAgent.count();
  if (count === 0) {
    throw new Error(
      'No agents in DB. Run `pnpm db:seed` before running API tests.',
    );
  }
});

describe('GET /api/agents', () => {
  it('returns an array of 10 seeded agents', async () => {
    const res = await request(app).get('/api/agents');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(10);
  });

  it('every agent has the expected core fields', async () => {
    const res = await request(app).get('/api/agents');
    for (const agent of res.body) {
      expect(agent).toHaveProperty('id');
      expect(agent).toHaveProperty('name');
      expect(agent).toHaveProperty('role');
      expect(agent).toHaveProperty('stage');
    }
  });

  it('filters by stage=front-stage', async () => {
    const res = await request(app).get('/api/agents?stage=front-stage');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(6);
    for (const a of res.body) expect(a.stage).toBe('front-stage');
  });

  it('filters by stage=back-stage', async () => {
    const res = await request(app).get('/api/agents?stage=back-stage');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(4);
    for (const a of res.body) expect(a.stage).toBe('back-stage');
  });
});

describe('GET /api/agents/:id', () => {
  it('returns a single agent when the id exists', async () => {
    const all = await request(app).get('/api/agents');
    const first = all.body[0];
    const res = await request(app).get(`/api/agents/${first.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(first.id);
  });

  it('returns 404 for a non-existent agent id', async () => {
    const res = await request(app).get('/api/agents/agent-does-not-exist-xyz');
    expect(res.status).toBe(404);
  });
});
