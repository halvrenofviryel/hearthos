import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '../src/policy/engine';
import {
  evaluateApproval,
  approvalLabel,
} from '../src/gates/human-approval-gate';

describe('evaluateApproval', () => {
  describe('execute-now (routine)', () => {
    const r = evaluateApproval('refresh-calendar');
    it('does not require parent approval', () => {
      expect(r.subClass).toBe('execute-now');
      expect(r.parent_approval_required).toBe(false);
    });
    it('has urgency=auto', () => {
      expect(r.urgency).toBe('auto');
    });
    it('still offers a decline escape hatch', () => {
      expect(r.approval_options).toEqual(['decline']);
    });
    it('returns a routine rationale string', () => {
      expect(r.rationale).toMatch(/routine/i);
    });
  });

  describe('execute-with-review (medium)', () => {
    const r = evaluateApproval('schedule a trial booking for swimming');
    it('classifies as execute-with-review when keywords match', () => {
      expect(r.subClass).toBe('execute-with-review');
    });
    it('requires parent approval', () => {
      expect(r.parent_approval_required).toBe(true);
    });
    it('offers approve / modify / decline', () => {
      expect(r.approval_options).toEqual(['approve', 'modify', 'decline']);
    });
    it('has urgency=review', () => {
      expect(r.urgency).toBe('review');
    });
  });

  describe('execute-high-stakes', () => {
    const r = evaluateApproval('start an annual subscription renewal');
    it('classifies as execute-high-stakes', () => {
      expect(r.subClass).toBe('execute-high-stakes');
    });
    it('requires parent approval', () => {
      expect(r.parent_approval_required).toBe(true);
    });
    it('offers the full option set including request-info', () => {
      expect(r.approval_options).toEqual([
        'approve', 'modify', 'decline', 'request-info',
      ]);
    });
    it('has urgency=block-until-approved', () => {
      expect(r.urgency).toBe('block-until-approved');
    });
    it('includes "cannot run on autopilot" framing', () => {
      expect(r.rationale).toMatch(/autopilot|explicitly approve/i);
    });
  });

  describe('engine injection', () => {
    it('reuses the same PolicyEngine instance when one is supplied', () => {
      const engine = new PolicyEngine();
      const r = evaluateApproval('routine task', engine);
      expect(r.subClass).toBe('execute-now');
    });

    it('uses a fresh engine when one is not supplied (no shared state leak)', () => {
      const r1 = evaluateApproval('a routine refresh');
      const r2 = evaluateApproval('publish to the family blog');
      expect(r1.subClass).toBe('execute-now');
      expect(r2.subClass).toBe('execute-high-stakes');
    });
  });

  describe('resource string is preserved', () => {
    it('echoes the resource verbatim in the result', () => {
      const r = evaluateApproval('Subscription renewal — Netflix');
      expect(r.resource).toBe('Subscription renewal — Netflix');
    });
  });
});

describe('approvalLabel', () => {
  it('returns "Routine" for execute-now', () => {
    expect(approvalLabel('execute-now')).toBe('Routine');
  });
  it('returns "Review and confirm" for execute-with-review', () => {
    expect(approvalLabel('execute-with-review')).toBe('Review and confirm');
  });
  it('returns "Parent approval required" for execute-high-stakes', () => {
    expect(approvalLabel('execute-high-stakes')).toBe('Parent approval required');
  });
});
