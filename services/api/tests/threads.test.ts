import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server';

const app = createApp();

describe('Threads — list / create / read', () => {
  it('GET /api/threads returns an array (possibly empty)', async () => {
    const res = await request(app).get('/api/threads?familyId=family-1');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/threads creates a thread and round-trips through GET', async () => {
    const agentsRes = await request(app).get('/api/agents?stage=front-stage');
    const agentId = agentsRes.body[0]?.id;
    expect(agentId).toBeTruthy();

    const create = await request(app)
      .post('/api/threads')
      .send({
        familyId: 'family-1',
        memberId: 'member-david',
        agentId,
        title: 'Test thread — created by api test',
      });

    expect(create.status).toBeLessThan(400);
    expect(create.body.id).toBeTruthy();

    const fetched = await request(app).get(`/api/threads/${create.body.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.title).toBe('Test thread — created by api test');
    expect(fetched.body.agentId).toBe(agentId);
  });

  it('GET /api/threads/:id/messages returns an array', async () => {
    const all = await request(app).get('/api/threads?familyId=family-1');
    if (all.body.length === 0) return; // nothing to test against
    const first = all.body[0];
    const res = await request(app).get(`/api/threads/${first.id}/messages`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
