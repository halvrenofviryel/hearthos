// ──────────────────────────────────────────────────────────────────────
// Activity Stream
//
// HearthOS Strategic Plan §3.3 + §6 (Rev 2 locked 2026-05-15).
//
// The richer, family-facing analogue of AuditLogger. The legacy
// AuditLogger is preserved for backwards compatibility; new code
// targeting the public-demo surface should use ActivityStream and
// the {@link ActivityEvent} shape.
//
// Public UI surfaces this as "Activity History" — never as "audit",
// because it is *not* a tamper-evident audit chain by default.
// Cryptographic chaining (previous_hash / event_hash) is reserved for
// the opt-in hearthos-phionyx-adapter package (Strategic Plan §3.4 +
// Stage 7) and the fields are simply left undefined here.
// ──────────────────────────────────────────────────────────────────────

export type ActivityRole = 'parent' | 'child' | 'agent' | 'staff' | 'unknown';

export type ActivityDecision = 'allowed' | 'denied' | 'requires_approval';

export interface ActivityEvent {
  /** Sequential event id assigned by the stream. */
  event_id: string;
  /** When the event was recorded. */
  timestamp: Date;
  /** Identifier of whoever (or whichever agent) generated the activity. */
  actor_id: string;
  /** Role of the actor — surfaces "AI proposes; parent executes" framing. */
  role: ActivityRole;
  /** Specific named agent (Family Coordinator, Gentle Reviewer, …), if any. */
  agent_id: string | null;
  /** What kind of action this is (CREATE_THREAD, SEND_MESSAGE, …). */
  action: string;
  /** The resource the action targets. */
  resource: string;
  /** Whether the action was allowed, denied, or queued for approval. */
  decision: ActivityDecision;
  /** Plain-English explanation of the decision; surfaces in UI. */
  reason: string;
  /** True when this event is queued, awaiting an explicit parent decision. */
  approval_required: boolean;

  // ── Optional cryptographic chaining (Stage 7 / adapter only) ───────
  /** Hash of the previous event in the chain (adapter-supplied). */
  previous_hash?: string;
  /** Hash of this event after canonical serialisation (adapter-supplied). */
  event_hash?: string;
}

/** Shape accepted by ActivityStream.record — id/timestamp are assigned. */
export type ActivityInput = Omit<ActivityEvent, 'event_id' | 'timestamp'> & {
  event_id?: string;
  timestamp?: Date;
};

export class ActivityStream {
  private events: ActivityEvent[] = [];
  private nextNum = 1;

  /**
   * Record a new event. The stream assigns event_id and timestamp
   * automatically when not supplied by the caller. The recorded event
   * is also returned so the caller can chain or audit it.
   */
  record(input: ActivityInput): ActivityEvent {
    const event: ActivityEvent = {
      event_id: input.event_id ?? `activity-${this.nextNum++}`,
      timestamp: input.timestamp ?? new Date(),
      actor_id: input.actor_id,
      role: input.role,
      agent_id: input.agent_id,
      action: input.action,
      resource: input.resource,
      decision: input.decision,
      reason: input.reason,
      approval_required: input.approval_required,
      previous_hash: input.previous_hash,
      event_hash: input.event_hash,
    };
    this.events.push(event);
    return event;
  }

  /** All recorded events; returned as a defensive copy. */
  getAll(): ActivityEvent[] {
    return [...this.events];
  }

  /** Filter by actor id (exact match). */
  getByActor(actorId: string): ActivityEvent[] {
    return this.events.filter((e) => e.actor_id === actorId);
  }

  /** Filter by resource (exact match). */
  getByResource(resource: string): ActivityEvent[] {
    return this.events.filter((e) => e.resource === resource);
  }

  /** Filter by agent id (exact match; ignores events with null agent_id). */
  getByAgent(agentId: string): ActivityEvent[] {
    return this.events.filter((e) => e.agent_id === agentId);
  }

  /** Filter by decision (allowed / denied / requires_approval). */
  getByDecision(decision: ActivityDecision): ActivityEvent[] {
    return this.events.filter((e) => e.decision === decision);
  }

  /**
   * Events currently waiting for a parent decision.
   * The "what should run on autopilot? what should not?" surface.
   */
  getRequiringApproval(): ActivityEvent[] {
    return this.events.filter((e) => e.approval_required);
  }

  /** The most recent N events, in insertion order. */
  getRecent(count: number): ActivityEvent[] {
    if (count <= 0) return [];
    return this.events.slice(-count);
  }

  /** Total event count. */
  size(): number {
    return this.events.length;
  }

  /** Drop every event and reset the id counter. */
  clear(): void {
    this.events = [];
    this.nextNum = 1;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Legacy AuditLogger interop
//
// AuditEntry shape predates ActivityEvent (§3.3). This adapter lets
// existing AuditLogger consumers move forward without forcing a hard
// migration. AuditEntry → ActivityEvent: missing fields take safe
// defaults; decision is derived from policyResult.allowed when present,
// or assumed "allowed" otherwise.
// ──────────────────────────────────────────────────────────────────────

import type { AuditEntry } from '../types';

const DEFAULT_REASON = 'No explicit reason recorded.';

export function fromAuditEntry(entry: AuditEntry): ActivityEvent {
  const policy = entry.policyResult;
  const decision: ActivityDecision = policy === undefined
    ? 'allowed'
    : policy.allowed
      ? 'allowed'
      : (policy.requiredApprovals && policy.requiredApprovals.length > 0
          ? 'requires_approval'
          : 'denied');
  const reason = policy?.reason ?? DEFAULT_REASON;
  const approval_required = decision === 'requires_approval';

  // Best-effort role guess from the actor id; concrete role data should
  // come through ActivityStream.record() directly when known.
  const role = guessRole(entry.actor);

  // agent_id is sometimes stored in details.agentId for AuditLogger
  // entries created by ConversationOrchestrator.
  const agentFromDetails = entry.details && typeof entry.details === 'object'
    ? (entry.details as Record<string, unknown>).agentId
    : undefined;
  const agent_id = typeof agentFromDetails === 'string' ? agentFromDetails : null;

  return {
    event_id: entry.id,
    timestamp: entry.timestamp,
    actor_id: entry.actor,
    role,
    agent_id,
    action: entry.action,
    resource: entry.resource,
    decision,
    reason,
    approval_required,
  };
}

function guessRole(actorId: string): ActivityRole {
  const lower = actorId.toLowerCase();
  if (lower.includes('agent') || lower.startsWith('agent-')) return 'agent';
  if (lower.includes('parent') || lower.includes('mother') || lower.includes('father')) return 'parent';
  if (lower.includes('child') || lower.includes('kid')) return 'child';
  if (lower.includes('staff')) return 'staff';
  return 'unknown';
}
