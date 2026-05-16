import { describe, it, expect, beforeEach } from 'vitest';
import {
  ActivityStream,
  fromAuditEntry,
  type ActivityEvent,
  type ActivityInput,
} from '../src/activity/activity-stream';
import type { AuditEntry } from '../src/types';

function sample(overrides: Partial<ActivityInput> = {}): ActivityInput {
  return {
    actor_id: 'member-david',
    role: 'parent',
    agent_id: null,
    action: 'PROPOSE_RESET',
    resource: 'weekly-reset',
    decision: 'allowed',
    reason: 'Routine planning action.',
    approval_required: false,
    ...overrides,
  };
}

describe('ActivityStream', () => {
  let stream: ActivityStream;

  beforeEach(() => {
    stream = new ActivityStream();
  });

  describe('record', () => {
    it('assigns sequential event ids when not supplied', () => {
      const a = stream.record(sample());
      const b = stream.record(sample());
      const c = stream.record(sample());
      expect(a.event_id).toBe('activity-1');
      expect(b.event_id).toBe('activity-2');
      expect(c.event_id).toBe('activity-3');
    });

    it('preserves a caller-supplied event id', () => {
      const e = stream.record(sample({ event_id: 'custom-event-xyz' }));
      expect(e.event_id).toBe('custom-event-xyz');
    });

    it('attaches a Date timestamp when not supplied', () => {
      const before = Date.now();
      const e = stream.record(sample());
      const after = Date.now();
      expect(e.timestamp).toBeInstanceOf(Date);
      expect(e.timestamp.getTime()).toBeGreaterThanOrEqual(before);
      expect(e.timestamp.getTime()).toBeLessThanOrEqual(after);
    });

    it('preserves a caller-supplied timestamp', () => {
      const dt = new Date('2026-01-01T12:00:00Z');
      const e = stream.record(sample({ timestamp: dt }));
      expect(e.timestamp).toEqual(dt);
    });

    it('preserves all spec fields verbatim', () => {
      const input = sample({
        actor_id: 'agent-coordinator',
        role: 'agent',
        agent_id: 'agent-steward',
        action: 'PROPOSE',
        resource: 'plan:weekly-1',
        decision: 'requires_approval',
        reason: 'High-stakes plan; parent approval required.',
        approval_required: true,
      });
      const e = stream.record(input);
      expect(e.actor_id).toBe('agent-coordinator');
      expect(e.role).toBe('agent');
      expect(e.agent_id).toBe('agent-steward');
      expect(e.action).toBe('PROPOSE');
      expect(e.resource).toBe('plan:weekly-1');
      expect(e.decision).toBe('requires_approval');
      expect(e.reason).toBe('High-stakes plan; parent approval required.');
      expect(e.approval_required).toBe(true);
    });

    it('leaves hash fields undefined by default (adapter-only)', () => {
      const e = stream.record(sample());
      expect(e.previous_hash).toBeUndefined();
      expect(e.event_hash).toBeUndefined();
    });

    it('preserves hash fields when an adapter supplies them', () => {
      const e = stream.record(
        sample({
          previous_hash: 'sha256:abcd1234',
          event_hash: 'sha256:efgh5678',
        }),
      );
      expect(e.previous_hash).toBe('sha256:abcd1234');
      expect(e.event_hash).toBe('sha256:efgh5678');
    });
  });

  describe('queries', () => {
    beforeEach(() => {
      stream.record(sample({ actor_id: 'david', role: 'parent', action: 'CREATE_PLAN' }));
      stream.record(sample({
        actor_id: 'agent-coordinator', role: 'agent', agent_id: 'agent-steward',
        action: 'PROPOSE', decision: 'allowed',
      }));
      stream.record(sample({
        actor_id: 'agent-coordinator', role: 'agent', agent_id: 'agent-steward',
        action: 'PROPOSE_HIGH_STAKES', resource: 'plan:hot',
        decision: 'requires_approval', approval_required: true,
        reason: 'Touches subscription budget.',
      }));
      stream.record(sample({
        actor_id: 'lily', role: 'child', action: 'REFUSE_SUGGESTION',
        decision: 'denied', reason: 'Child cannot execute parent-only actions.',
      }));
    });

    it('getAll returns a defensive copy', () => {
      const all = stream.getAll();
      const before = all.length;
      all.push({} as ActivityEvent);
      expect(stream.getAll().length).toBe(before);
    });

    it('getByActor filters exact match', () => {
      expect(stream.getByActor('david')).toHaveLength(1);
      expect(stream.getByActor('agent-coordinator')).toHaveLength(2);
      expect(stream.getByActor('nobody')).toHaveLength(0);
    });

    it('getByResource filters exact match', () => {
      expect(stream.getByResource('plan:hot')).toHaveLength(1);
      expect(stream.getByResource('weekly-reset')).toHaveLength(3);
    });

    it('getByAgent ignores null agent ids', () => {
      expect(stream.getByAgent('agent-steward')).toHaveLength(2);
      expect(stream.getByAgent('agent-nonexistent')).toHaveLength(0);
    });

    it('getByDecision filters by allowed / denied / requires_approval', () => {
      expect(stream.getByDecision('allowed')).toHaveLength(2);
      expect(stream.getByDecision('requires_approval')).toHaveLength(1);
      expect(stream.getByDecision('denied')).toHaveLength(1);
    });

    it('getRequiringApproval surfaces the parent-decision queue', () => {
      const pending = stream.getRequiringApproval();
      expect(pending).toHaveLength(1);
      expect(pending[0].action).toBe('PROPOSE_HIGH_STAKES');
    });

    it('getRecent returns the last N in insertion order', () => {
      const last2 = stream.getRecent(2);
      expect(last2).toHaveLength(2);
      expect(last2[0].actor_id).toBe('agent-coordinator');
      expect(last2[1].actor_id).toBe('lily');
    });

    it('getRecent(0) returns empty', () => {
      expect(stream.getRecent(0)).toHaveLength(0);
    });

    it('size returns the current count', () => {
      expect(stream.size()).toBe(4);
      stream.record(sample());
      expect(stream.size()).toBe(5);
    });
  });

  describe('clear', () => {
    it('drops every event and resets the id counter', () => {
      stream.record(sample());
      stream.record(sample());
      stream.clear();
      expect(stream.size()).toBe(0);
      const fresh = stream.record(sample());
      expect(fresh.event_id).toBe('activity-1');
    });
  });
});

describe('fromAuditEntry (legacy adapter)', () => {
  function legacy(overrides: Partial<AuditEntry> = {}): AuditEntry {
    return {
      id: 'audit-1',
      timestamp: new Date('2026-01-01T00:00:00Z'),
      actor: 'member-david',
      action: 'CREATE_THREAD',
      resource: 'thread:1',
      details: {},
      ...overrides,
    };
  }

  it('preserves id / timestamp / actor / action / resource', () => {
    const a = legacy({ id: 'audit-42' });
    const e = fromAuditEntry(a);
    expect(e.event_id).toBe('audit-42');
    expect(e.timestamp).toEqual(a.timestamp);
    expect(e.actor_id).toBe('member-david');
    expect(e.action).toBe('CREATE_THREAD');
    expect(e.resource).toBe('thread:1');
  });

  it('decision defaults to allowed when no policyResult is present', () => {
    const e = fromAuditEntry(legacy());
    expect(e.decision).toBe('allowed');
    expect(e.approval_required).toBe(false);
    expect(e.reason).toMatch(/no explicit reason/i);
  });

  it('decision = allowed when policyResult.allowed is true', () => {
    const a = legacy({
      policyResult: { allowed: true, reason: 'Parents can execute changes' },
    });
    const e = fromAuditEntry(a);
    expect(e.decision).toBe('allowed');
    expect(e.reason).toBe('Parents can execute changes');
    expect(e.approval_required).toBe(false);
  });

  it('decision = denied when policyResult.allowed is false and no approvals', () => {
    const a = legacy({
      actor: 'member-lily',
      policyResult: { allowed: false, reason: 'Children cannot execute changes' },
    });
    const e = fromAuditEntry(a);
    expect(e.decision).toBe('denied');
    expect(e.approval_required).toBe(false);
  });

  it('decision = requires_approval when policyResult has requiredApprovals', () => {
    const a = legacy({
      actor: 'agent-steward',
      policyResult: {
        allowed: false,
        reason: 'Staff need parent approval to execute',
        requiredApprovals: ['parent'],
      },
    });
    const e = fromAuditEntry(a);
    expect(e.decision).toBe('requires_approval');
    expect(e.approval_required).toBe(true);
  });

  it('lifts agentId from details when present', () => {
    const a = legacy({
      details: { agentId: 'agent-coordinator' },
    });
    const e = fromAuditEntry(a);
    expect(e.agent_id).toBe('agent-coordinator');
  });

  it('agent_id is null when details has no agentId', () => {
    expect(fromAuditEntry(legacy({ details: { other: true } })).agent_id).toBeNull();
    expect(fromAuditEntry(legacy({ details: {} })).agent_id).toBeNull();
  });

  it('guesses role from actor id', () => {
    expect(fromAuditEntry(legacy({ actor: 'agent-steward' })).role).toBe('agent');
    expect(fromAuditEntry(legacy({ actor: 'member-david-parent' })).role).toBe('parent');
    expect(fromAuditEntry(legacy({ actor: 'kid-lily' })).role).toBe('child');
    expect(fromAuditEntry(legacy({ actor: 'staff-tutor' })).role).toBe('staff');
    expect(fromAuditEntry(legacy({ actor: 'unknown-99' })).role).toBe('unknown');
  });
});
