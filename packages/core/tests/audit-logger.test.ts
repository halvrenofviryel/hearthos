import { describe, it, expect, beforeEach } from 'vitest';
import { AuditLogger } from '../src/audit/logger';

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(() => {
    logger = new AuditLogger();
  });

  describe('log', () => {
    it('assigns sequential ids', () => {
      const a = logger.log({ actor: 'a', action: 'CREATE', resource: 'r1', details: {} });
      const b = logger.log({ actor: 'a', action: 'UPDATE', resource: 'r1', details: {} });
      const c = logger.log({ actor: 'a', action: 'DELETE', resource: 'r1', details: {} });
      expect(a.id).toBe('audit-1');
      expect(b.id).toBe('audit-2');
      expect(c.id).toBe('audit-3');
    });

    it('attaches a timestamp', () => {
      const entry = logger.log({ actor: 'a', action: 'X', resource: 'r', details: {} });
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(entry.timestamp.getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('preserves provided fields', () => {
      const entry = logger.log({
        actor: 'member-david',
        action: 'CREATE_THREAD',
        resource: 'thread:1',
        details: { title: 'Homework' },
      });
      expect(entry.actor).toBe('member-david');
      expect(entry.action).toBe('CREATE_THREAD');
      expect(entry.resource).toBe('thread:1');
      expect(entry.details).toEqual({ title: 'Homework' });
    });

    it('returns the stored entry', () => {
      const entry = logger.log({ actor: 'a', action: 'X', resource: 'r', details: {} });
      expect(logger.getAll()).toContainEqual(entry);
    });
  });

  describe('queries', () => {
    beforeEach(() => {
      logger.log({ actor: 'david', action: 'READ', resource: 'plan:1', details: {} });
      logger.log({ actor: 'david', action: 'PROPOSE', resource: 'plan:1', details: {} });
      logger.log({ actor: 'maria', action: 'EXECUTE', resource: 'plan:1', details: {} });
      logger.log({ actor: 'emma', action: 'READ', resource: 'thread:5', details: {} });
    });

    it('getAll returns a copy (mutations do not leak)', () => {
      const all = logger.getAll();
      const before = all.length;
      all.push({ id: 'fake', timestamp: new Date(), actor: 'x', action: 'X', resource: 'r', details: {} });
      expect(logger.getAll().length).toBe(before);
    });

    it('getByActor filters by actor id', () => {
      expect(logger.getByActor('david')).toHaveLength(2);
      expect(logger.getByActor('maria')).toHaveLength(1);
      expect(logger.getByActor('nonexistent')).toHaveLength(0);
    });

    it('getByResource filters by resource id', () => {
      expect(logger.getByResource('plan:1')).toHaveLength(3);
      expect(logger.getByResource('thread:5')).toHaveLength(1);
      expect(logger.getByResource('unknown')).toHaveLength(0);
    });

    it('getRecent returns the last N entries in insertion order', () => {
      const last2 = logger.getRecent(2);
      expect(last2).toHaveLength(2);
      expect(last2[0].action).toBe('EXECUTE');
      expect(last2[1].action).toBe('READ');
      expect(last2[1].actor).toBe('emma');
    });

    it('getRecent with N greater than total returns all entries', () => {
      expect(logger.getRecent(100)).toHaveLength(4);
    });

    it('getRecent with 0 returns empty', () => {
      expect(logger.getRecent(0)).toHaveLength(0);
    });
  });

  describe('clear', () => {
    it('drops all entries and resets the id counter', () => {
      logger.log({ actor: 'x', action: 'A', resource: 'r', details: {} });
      logger.log({ actor: 'x', action: 'B', resource: 'r', details: {} });
      logger.clear();
      expect(logger.getAll()).toHaveLength(0);
      const fresh = logger.log({ actor: 'x', action: 'C', resource: 'r', details: {} });
      expect(fresh.id).toBe('audit-1');
    });
  });
});
