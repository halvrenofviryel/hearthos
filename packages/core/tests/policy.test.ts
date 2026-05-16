import { describe, it, expect, beforeEach } from 'vitest';
import { PolicyEngine } from '../src/policy/engine';

describe('PolicyEngine', () => {
  let engine: PolicyEngine;

  beforeEach(() => {
    engine = new PolicyEngine();
  });

  describe('READ action', () => {
    it('allows parents to read anything', () => {
      const result = engine.evaluate({
        action: 'READ',
        resource: 'thread:1',
        actor: { id: 'member-david', role: 'parent' },
        target: { id: 'member-lily', role: 'child' },
      });
      expect(result.allowed).toBe(true);
    });

    it('allows children to read their own data', () => {
      const result = engine.evaluate({
        action: 'READ',
        resource: 'plan:1',
        actor: { id: 'member-lily', role: 'child' },
        target: { id: 'member-lily', role: 'child' },
      });
      expect(result.allowed).toBe(true);
    });

    it('allows children to read when no target specified', () => {
      const result = engine.evaluate({
        action: 'READ',
        resource: 'dashboard',
        actor: { id: 'member-lily', role: 'child' },
      });
      expect(result.allowed).toBe(true);
    });

    it('denies children reading other members\' data', () => {
      const result = engine.evaluate({
        action: 'READ',
        resource: 'plan:1',
        actor: { id: 'member-lily', role: 'child' },
        target: { id: 'member-max', role: 'child' },
      });
      expect(result.allowed).toBe(false);
    });

    it('allows staff to read family data', () => {
      const result = engine.evaluate({
        action: 'READ',
        resource: 'thread:1',
        actor: { id: 'agent-emma', role: 'staff' },
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe('PROPOSE action', () => {
    it('allows parents to propose', () => {
      const result = engine.evaluate({
        action: 'PROPOSE',
        resource: 'plan:1',
        actor: { id: 'member-david', role: 'parent' },
      });
      expect(result.allowed).toBe(true);
    });

    it('allows staff to propose', () => {
      const result = engine.evaluate({
        action: 'PROPOSE',
        resource: 'plan:1',
        actor: { id: 'agent-emma', role: 'staff' },
      });
      expect(result.allowed).toBe(true);
    });

    it('allows children to propose changes to their own plans', () => {
      const result = engine.evaluate({
        action: 'PROPOSE',
        resource: 'plan:1',
        actor: { id: 'member-lily', role: 'child' },
        target: { id: 'member-lily', role: 'child' },
      });
      expect(result.allowed).toBe(true);
    });

    it('denies children proposing changes to others\' plans', () => {
      const result = engine.evaluate({
        action: 'PROPOSE',
        resource: 'plan:1',
        actor: { id: 'member-lily', role: 'child' },
        target: { id: 'member-max', role: 'child' },
      });
      expect(result.allowed).toBe(false);
    });
  });

  describe('EXECUTE action', () => {
    it('allows parents to execute', () => {
      const result = engine.evaluate({
        action: 'EXECUTE',
        resource: 'plan:1',
        actor: { id: 'member-david', role: 'parent' },
      });
      expect(result.allowed).toBe(true);
    });

    it('denies staff execution and requires parent approval', () => {
      const result = engine.evaluate({
        action: 'EXECUTE',
        resource: 'plan:1',
        actor: { id: 'agent-emma', role: 'staff' },
      });
      expect(result.allowed).toBe(false);
      expect(result.requiredApprovals).toContain('parent');
    });

    it('denies children from executing', () => {
      const result = engine.evaluate({
        action: 'EXECUTE',
        resource: 'plan:1',
        actor: { id: 'member-lily', role: 'child' },
      });
      expect(result.allowed).toBe(false);
    });
  });

  describe('unknown action', () => {
    it('denies unknown actions', () => {
      const result = engine.evaluate({
        action: 'DELETE' as any,
        resource: 'plan:1',
        actor: { id: 'member-david', role: 'parent' },
      });
      expect(result.allowed).toBe(false);
    });
  });
});
