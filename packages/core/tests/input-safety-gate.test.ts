import { describe, it, expect } from 'vitest';
import {
  evaluateInputSafety,
  wrapAsSafeProposal,
} from '../src/gates/input-safety-gate';

describe('evaluateInputSafety', () => {
  describe('pass-through (no sensitive keywords)', () => {
    it('returns un-triggered for a routine meal-prep prompt', () => {
      const r = evaluateInputSafety('Plan our breakfast rotation for the week.');
      expect(r.triggered).toBe(false);
      expect(r.category).toBeNull();
      expect(r.parent_approval_required).toBe(false);
      expect(r.approval_options).toBeNull();
    });

    it('returns un-triggered for empty / whitespace input', () => {
      expect(evaluateInputSafety('').triggered).toBe(false);
      expect(evaluateInputSafety('   ').triggered).toBe(false);
    });
  });

  describe('financial', () => {
    it('detects subscription mentions', () => {
      const r = evaluateInputSafety('Should we cancel the streaming subscription this month?');
      expect(r.triggered).toBe(true);
      expect(r.category).toBe('financial');
      expect(r.parent_approval_required).toBe(true);
      expect(r.approval_options).toEqual(['approve', 'modify', 'decline']);
    });

    it('detects payment / purchase wording', () => {
      expect(evaluateInputSafety('I want to buy a new bike.').category).toBe('financial');
      expect(evaluateInputSafety('Annual fee renewal next week.').category).toBe('financial');
      expect(evaluateInputSafety('We need to pay the school invoice.').category).toBe('financial');
    });

    it('financial takes priority over child-decision when both present', () => {
      // "child" and "purchase" both match; financial is first in CATEGORIES
      const r = evaluateInputSafety('My child wants to make a purchase this weekend.');
      expect(r.category).toBe('financial');
    });
  });

  describe('external_share', () => {
    it('detects social-share intent', () => {
      const r = evaluateInputSafety("I want to post the kids' photo on Instagram.");
      expect(r.triggered).toBe(true);
      expect(r.category).toBe('external_share');
    });

    it('detects forward / send-to / share verbs', () => {
      expect(evaluateInputSafety('Forward this to grandma.').category).toBe('external_share');
      expect(evaluateInputSafety('Make this story public.').category).toBe('external_share');
    });
  });

  describe('health_school', () => {
    it('flags health-professional mentions', () => {
      expect(evaluateInputSafety('We should book a doctor visit.').category).toBe('health_school');
      expect(evaluateInputSafety('She needs a therapy session.').category).toBe('health_school');
    });

    it('flags school administrative mentions', () => {
      expect(evaluateInputSafety("Email the school principal about it.").category).toBe(
        'health_school',
      );
    });
  });

  describe('child_decision', () => {
    it('flags pure child-related decisions', () => {
      const r = evaluateInputSafety('How much screen time should my daughter have?');
      expect(r.triggered).toBe(true);
      expect(r.category).toBe('child_decision');
    });

    it('flags discipline mentions', () => {
      expect(evaluateInputSafety("The right discipline for this behaviour?").category).toBe(
        'child_decision',
      );
    });
  });

  describe('rationale and contract', () => {
    it('always returns a non-empty rationale', () => {
      for (const input of [
        '',
        'Plan the chores.',
        'Subscribe to a new service.',
        'How to discipline my teen?',
      ]) {
        const r = evaluateInputSafety(input);
        expect(typeof r.rationale).toBe('string');
        expect(r.rationale.length).toBeGreaterThan(0);
      }
    });

    it('triggered results always have parent_approval_required = true', () => {
      const triggered = [
        'pay the bill',
        'share their photo',
        'see a doctor',
        'discipline the kids',
      ];
      for (const t of triggered) {
        const r = evaluateInputSafety(t);
        expect(r.triggered).toBe(true);
        expect(r.parent_approval_required).toBe(true);
        expect(r.approval_options).not.toBeNull();
      }
    });

    it('case-insensitive matching', () => {
      expect(evaluateInputSafety('SUBSCRIPTION renewal coming up').category).toBe('financial');
      expect(evaluateInputSafety('Subscription Renewal').category).toBe('financial');
    });
  });
});

describe('wrapAsSafeProposal', () => {
  it('returns type=direct when input is benign', () => {
    const p = wrapAsSafeProposal('Plan the week', 'Here is a draft.');
    expect(p.type).toBe('direct');
    expect(p.category).toBeNull();
    expect(p.draft).toBe('Here is a draft.');
    expect(p.parent_approval_required).toBe(false);
    expect(p.approval_options).toBeNull();
  });

  it('returns type=safe_proposal when input triggers the gate', () => {
    const p = wrapAsSafeProposal(
      'Cancel the streaming subscription',
      'Recommended: cancel after the trial.',
    );
    expect(p.type).toBe('safe_proposal');
    expect(p.category).toBe('financial');
    expect(p.draft).toBe('Recommended: cancel after the trial.');
    expect(p.parent_approval_required).toBe(true);
    expect(p.approval_options).toEqual(['approve', 'modify', 'decline']);
  });

  it('preserves the draft regardless of trigger', () => {
    const longDraft = 'A multi-line draft with several recommendations.';
    expect(wrapAsSafeProposal('benign', longDraft).draft).toBe(longDraft);
    expect(wrapAsSafeProposal('subscription', longDraft).draft).toBe(longDraft);
  });
});
