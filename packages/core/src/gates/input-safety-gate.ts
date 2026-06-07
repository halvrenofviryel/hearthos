// ──────────────────────────────────────────────────────────────────────
// Input Safety Gate
//
// HearthOS Strategic Plan §3.1 (Rev 2 locked 2026-05-15).
//
// The front-door check for the public demo. When an incoming description
// touches a sensitive area (child decisions, finance, external sharing,
// health/school), the gate flags it as requiring explicit parent
// approval rather than a "direct answer".
//
// This gate is intentionally simple: keyword categorisation, no LLM,
// no learned model. The point is to make the bounded-authority pattern
// *visible* — the family should see when a proposal touches something
// that should never run on autopilot.
//
// Phionyx profile: SAFETY GATE (the boundary). See docs/PHIONYX_PROFILES.md.
// ──────────────────────────────────────────────────────────────────────

export type SensitiveCategory =
  | 'child_decision'
  | 'financial'
  | 'external_share'
  | 'health_school';

export type ApprovalOption = 'approve' | 'modify' | 'decline';

export interface SafetyGateResult {
  /** The triggered category, or null when the gate did not match. */
  category: SensitiveCategory | null;
  /** True iff the gate matched a sensitive category. */
  triggered: boolean;
  /** Human-readable rationale; safe to surface in UI. */
  rationale: string;
  /** Whether the proposal must wait for explicit parent approval. */
  parent_approval_required: boolean;
  /** Available approval actions when triggered; null when not triggered. */
  approval_options: readonly ApprovalOption[] | null;
}

interface CategoryDef {
  category: SensitiveCategory;
  keywords: readonly string[];
  rationale: string;
}

/**
 * Category definitions. Order matters: the first match wins, so more
 * specific or higher-stakes categories come first.
 */
const CATEGORIES: readonly CategoryDef[] = [
  {
    category: 'financial',
    keywords: [
      'subscription', 'payment', 'pay', 'price', 'buy', 'purchase', 'cost',
      'fee', 'invoice', 'bill', 'billing', 'charge', 'annual', 'monthly',
      'refund', 'card', 'credit', 'debit', 'paypal', 'stripe',
    ],
    rationale:
      'Money decisions should never be implicit. This needs an explicit parent approval before anything executes.',
  },
  {
    category: 'external_share',
    keywords: [
      'share', 'shared', 'sharing', 'post', 'publish', 'broadcast', 'tweet',
      'instagram', 'facebook', 'social media', 'whatsapp', 'forward',
      'send to', 'email to', 'invite', 'public',
    ],
    rationale:
      'Anything that leaves the family — photos, names, schedules, messages — is a parent decision, not an agent default.',
  },
  {
    category: 'health_school',
    keywords: [
      'doctor', 'medical', 'medication', 'medicine', 'illness', 'ill',
      'sick', 'therapy', 'therapist', 'psychologist', 'counsellor',
      'counselor', 'diagnosis', 'school', 'teacher', 'principal', 'report',
      'gp', 'clinic', 'hospital',
    ],
    rationale:
      'Health and school decisions involve professionals and stay parent-owned. HearthOS can summarise but never advise unilaterally.',
  },
  {
    category: 'child_decision',
    keywords: [
      'child', 'kid', 'kids', 'children', 'son', 'daughter', 'baby',
      'toddler', 'teenager', 'teen', 'adolescent',
      // child-specific concerns
      'discipline', 'punish', 'punishment', 'consequence', 'sleep schedule',
      'screen time', 'phone time',
    ],
    rationale:
      'Decisions about children stay with the parents. HearthOS proposes options and surfaces trade-offs; the parent chooses.',
  },
];

/** Default options offered when a sensitive category is triggered. */
const DEFAULT_APPROVAL_OPTIONS: readonly ApprovalOption[] = [
  'approve',
  'modify',
  'decline',
] as const;

/**
 * Evaluate raw text input against the sensitive-category map.
 *
 * Matching is case-insensitive substring match on the lower-cased input.
 * The first category whose keyword set matches wins; the order in
 * {@link CATEGORIES} is therefore the priority order.
 */
export function evaluateInputSafety(input: string): SafetyGateResult {
  const safe: SafetyGateResult = {
    category: null,
    triggered: false,
    rationale: 'No sensitive category detected — proposal can be shown directly.',
    parent_approval_required: false,
    approval_options: null,
  };

  if (typeof input !== 'string' || input.trim().length === 0) {
    return safe;
  }

  const lower = input.toLowerCase();
  for (const def of CATEGORIES) {
    if (def.keywords.some((k) => lower.includes(k))) {
      return {
        category: def.category,
        triggered: true,
        rationale: def.rationale,
        parent_approval_required: true,
        approval_options: DEFAULT_APPROVAL_OPTIONS,
      };
    }
  }
  return safe;
}

/**
 * Wrap a draft response in the safety envelope when the input triggers
 * the gate. When the gate does not trigger, returns the draft unchanged
 * as a normal pass-through.
 */
export interface SafeProposal {
  type: 'safe_proposal' | 'direct';
  category: SensitiveCategory | null;
  draft: string;
  rationale: string;
  parent_approval_required: boolean;
  approval_options: readonly ApprovalOption[] | null;
}

export function wrapAsSafeProposal(input: string, draft: string): SafeProposal {
  const gate = evaluateInputSafety(input);
  return {
    type: gate.triggered ? 'safe_proposal' : 'direct',
    category: gate.category,
    draft,
    rationale: gate.rationale,
    parent_approval_required: gate.parent_approval_required,
    approval_options: gate.approval_options,
  };
}
