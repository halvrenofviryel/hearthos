// ──────────────────────────────────────────────────────────────────────
// Human Approval Gate
//
// HearthOS Strategic Plan §3.5 (Rev 2 locked 2026-05-15).
//
// "AI proposes; the parent executes." This gate is the explicit
// instantiation of that line. It uses the existing PolicyEngine's
// EXECUTE sub-classification (execute-now / execute-with-review /
// execute-high-stakes) and turns it into a structured approval
// decision that the UI can render directly.
//
// The gate does NOT decide whether the action *itself* is allowed —
// that is the PolicyEngine's job and runs first. The approval gate
// runs *after* allow has been granted, and decides what UX is
// required before the action actually fires.
// ──────────────────────────────────────────────────────────────────────

import { PolicyEngine } from '../policy/engine';
import type { ExecuteSubClass } from '../types';

export type ApprovalAction = 'approve' | 'modify' | 'decline' | 'request-info';

export type ApprovalUrgency = 'auto' | 'review' | 'block-until-approved';

export interface ApprovalGateResult {
  /** The resource string the gate was evaluated against. */
  resource: string;
  /** Sub-class returned by the PolicyEngine. */
  subClass: ExecuteSubClass;
  /** Whether the action requires explicit human approval before executing. */
  parent_approval_required: boolean;
  /** Available actions for the human reviewer; ordered from default to escape-hatch. */
  approval_options: readonly ApprovalAction[];
  /** Whether the action should fire immediately, wait for review, or be hard-blocked. */
  urgency: ApprovalUrgency;
  /** Human-readable explanation suitable for UI surfacing. */
  rationale: string;
}

const ALL_OPTIONS: readonly ApprovalAction[] = [
  'approve',
  'modify',
  'decline',
  'request-info',
] as const;

const QUICK_REVIEW_OPTIONS: readonly ApprovalAction[] = [
  'approve',
  'modify',
  'decline',
] as const;

const AUTO_OPTIONS: readonly ApprovalAction[] = ['decline'] as const;

const SUBCLASS_RATIONALE: Record<ExecuteSubClass, string> = {
  'execute-now':
    'Routine action — agents may apply this directly. The parent can still decline retroactively.',
  'execute-with-review':
    'Medium-risk action — the parent should see this before it lands. Suggested defaults are pre-filled; review and confirm.',
  'execute-high-stakes':
    'High-stakes action — this cannot run on autopilot. The parent must explicitly approve before anything executes.',
};

const SUBCLASS_URGENCY: Record<ExecuteSubClass, ApprovalUrgency> = {
  'execute-now': 'auto',
  'execute-with-review': 'review',
  'execute-high-stakes': 'block-until-approved',
};

const SUBCLASS_OPTIONS: Record<ExecuteSubClass, readonly ApprovalAction[]> = {
  'execute-now': AUTO_OPTIONS,
  'execute-with-review': QUICK_REVIEW_OPTIONS,
  'execute-high-stakes': ALL_OPTIONS,
};

const SUBCLASS_APPROVAL_REQUIRED: Record<ExecuteSubClass, boolean> = {
  'execute-now': false,
  'execute-with-review': true,
  'execute-high-stakes': true,
};

/**
 * Evaluate a resource string and return the approval decision required
 * before the resource action may execute.
 *
 * The caller should run the PolicyEngine's allow-check first; this gate
 * only describes the UX gate that follows a granted allow.
 */
export function evaluateApproval(
  resource: string,
  engine: PolicyEngine = new PolicyEngine(),
): ApprovalGateResult {
  const subClass = engine.classifyExecute(resource);
  return {
    resource,
    subClass,
    parent_approval_required: SUBCLASS_APPROVAL_REQUIRED[subClass],
    approval_options: SUBCLASS_OPTIONS[subClass],
    urgency: SUBCLASS_URGENCY[subClass],
    rationale: SUBCLASS_RATIONALE[subClass],
  };
}

/**
 * The user-visible string for a sub-class. Public UI should surface this
 * rather than the bare sub-class name.
 */
export function approvalLabel(subClass: ExecuteSubClass): string {
  switch (subClass) {
    case 'execute-now':
      return 'Routine';
    case 'execute-with-review':
      return 'Review and confirm';
    case 'execute-high-stakes':
      return 'Parent approval required';
  }
}
