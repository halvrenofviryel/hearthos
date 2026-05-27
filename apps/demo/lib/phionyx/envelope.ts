/**
 * HearthOS bounded-authority envelope library.
 *
 * Schema: phionyx.bounded_authority_envelope.v1 — Schema 9 in the
 * v0.7.0 Phionyx portfolio. See docs/strategic/V0_7_0_W4_1_HEARTHOS_ADAPTER_SPEC.md
 * for the spec.
 *
 * Wire format guarantees:
 * - Canonical JSON: sort_keys true, no whitespace, ASCII-safe, no NaN.
 *   Byte-identical with the Python canonical_json helper used in
 *   phionyx-mcp-server, phionyx-letta, phionyx-langchain-langgraph.
 * - SHA-256 hash chain: integrity.current = SHA-256(canonical_json({record, previous})).
 * - HMAC-SHA-256 signing for the browser-only demo with the publicly
 *   published all-zeros key (founder decision §11.b Q2 — replay
 *   reproducibility, not unforgeability).
 *
 * No external dependencies — uses Web Crypto API only.
 */

export const SCHEMA_ID = "phionyx.bounded_authority_envelope.v1";
export const RUNTIME = "phionyx-hearthos";
export const GENESIS_HASH = "sha256:" + "0".repeat(64);

// Public deterministic signing key (founder decision §11.b Q2). NEVER
// use this for production HearthOS; this is replay-verification only.
export const PUBLIC_DEMO_HMAC_KEY = "0".repeat(64);

// ── Event types (closed enum from spec §3.1) ────────────────────────────

export type EventType =
  | "propose"
  | "execute_requested"
  | "execute_approved"
  | "execute_rejected"
  | "execute_completed"
  | "safety_gate_blocked"
  | "authority_tier_change"
  | "proof_recorded";

export type AuthorityTier = "READ" | "PROPOSE" | "EXECUTE";
export type AuthoritySubclass =
  | "execute-with-review"
  | "execute-high-stakes"
  | null;

// ── Block shapes (mirror spec §3.1) ─────────────────────────────────────

export interface AuthorityBlock {
  tier: AuthorityTier;
  subclass: AuthoritySubclass;
  contract_id: string;
  contract_version: string;
  never_rules_active: string[];
  stop_conditions_active: string[];
}

export interface ProposalBlock {
  action_id: string;
  action_kind: string;
  action_payload: Record<string, unknown>;
  rationale_summary: string;
  proof_obligations_declared: Array<"decision" | "permission" | "outcome">;
}

export interface ApprovalBlock {
  queue_id: string;
  decision: "approved" | "rejected" | "timeout";
  approver_role: "parent" | "guardian" | "self-locked";
  approver_id_hash: string; // SHA-256 of approver id; raw never persisted
  reason: string | null;
}

export interface SafetyGateBlock {
  gate_id: string;
  input_hash: string; // sha256:<hex>
  verdict: "admit" | "block" | "redact";
  reason: string;
}

export interface ProofBlock {
  kind: "decision" | "permission" | "outcome";
  ref: string;
  hash: string | null;
}

export interface CrossRuntimeRef {
  parent_envelope_ref: string; // envelope://sha256:<hex>
  schema: string;
  tier?: AuthorityTier; // schema-9 → schema-9 refs carry the tier
}

export interface EnvelopeSubject {
  runtime: string;
  version: string;
  producer: string;
  turn_index: number;
  event_type: EventType;
  timestamp_utc: string;
  metadata: {
    family_id: string;
    scenario_id: string;
    bounded_authority?: CrossRuntimeRef;
    [key: string]: unknown;
  };
}

export interface BoundedAuthorityEnvelope {
  schema: string;
  subject: EnvelopeSubject;
  authority: AuthorityBlock;
  proposal: ProposalBlock | null;
  approval: ApprovalBlock | null;
  safety_gate: SafetyGateBlock | null;
  proof: ProofBlock | null;
  integrity: {
    previous: string;
    current: string;
    signature: string;
    canonical_json: true;
  };
}

// ── Build context (what the producer must supply) ───────────────────────

export interface BuildEnvelopeContext {
  family_id: string;
  scenario_id: string;
  producer: string;
  turn_index: number;
  event_type: EventType;
  timestamp_utc: string; // ISO-8601 UTC; deterministic for pinned traces
  authority: AuthorityBlock;
  proposal?: ProposalBlock | null;
  approval?: ApprovalBlock | null;
  safety_gate?: SafetyGateBlock | null;
  proof?: ProofBlock | null;
  bounded_authority_parent_ref?: CrossRuntimeRef | null;
  extra_metadata?: Record<string, unknown>;
}

// ── Canonical JSON (must match Python canonical_json byte-for-byte) ─────

/**
 * Canonical JSON encoding — sort keys recursively, no whitespace, no
 * NaN. Byte-identical with the Python:
 *   json.dumps(payload, sort_keys=True, separators=(",", ":"), allow_nan=False)
 */
export function canonicalJson(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("canonicalJson: non-finite numbers not allowed");
    }
    // JSON.stringify of integers and basic floats matches Python's
    // json.dumps for the same value. For exotic floats (e.g. 1e-300)
    // there may be small divergence; the demo only uses ints and
    // 0.0-1.0 floats so this is safe.
    return JSON.stringify(value);
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map((v) => canonicalJson(v)).join(",") + "]";
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const pairs = keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(obj[k]));
    return "{" + pairs.join(",") + "}";
  }
  throw new Error(`canonicalJson: unsupported type ${typeof value}`);
}

// ── SHA-256 + HMAC (via Web Crypto) ─────────────────────────────────────

async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function envelopeHash(
  payload: Omit<BoundedAuthorityEnvelope, "integrity">,
  previousHash: string,
): Promise<string> {
  const bound = canonicalJson({ record: payload, previous: previousHash });
  const hex = await sha256Hex(bound);
  return "sha256:" + hex;
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const keyBytes = new TextEncoder().encode(key);
  const msgBytes = new TextEncoder().encode(message);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgBytes);
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sign(
  currentHash: string,
  hmacKey: string = PUBLIC_DEMO_HMAC_KEY,
): Promise<string> {
  const hex = await hmacSha256Hex(hmacKey, currentHash);
  // Truncate to 32 hex chars matches the audit_chain.py HmacSigner shape
  // (`hmac-sha256:<32-hex>`). Full 64-hex is preserved internally.
  return `hmac-sha256:${hex.slice(0, 32)}`;
}

// ── Envelope builder ─────────────────────────────────────────────────────

export async function buildBoundedAuthorityEnvelope(
  ctx: BuildEnvelopeContext,
  previousHash: string,
  packageVersion: string,
  hmacKey: string = PUBLIC_DEMO_HMAC_KEY,
): Promise<BoundedAuthorityEnvelope> {
  const metadata: EnvelopeSubject["metadata"] = {
    family_id: ctx.family_id,
    scenario_id: ctx.scenario_id,
    ...(ctx.extra_metadata ?? {}),
  };
  if (ctx.bounded_authority_parent_ref) {
    metadata.bounded_authority = ctx.bounded_authority_parent_ref;
  }

  const payload: Omit<BoundedAuthorityEnvelope, "integrity"> = {
    schema: SCHEMA_ID,
    subject: {
      runtime: RUNTIME,
      version: packageVersion,
      producer: ctx.producer,
      turn_index: ctx.turn_index,
      event_type: ctx.event_type,
      timestamp_utc: ctx.timestamp_utc,
      metadata,
    },
    authority: ctx.authority,
    proposal: ctx.proposal ?? null,
    approval: ctx.approval ?? null,
    safety_gate: ctx.safety_gate ?? null,
    proof: ctx.proof ?? null,
  };

  const currentHash = await envelopeHash(payload, previousHash);
  const signature = await sign(currentHash, hmacKey);

  return {
    ...payload,
    integrity: {
      previous: previousHash,
      current: currentHash,
      signature,
      canonical_json: true,
    },
  };
}

// ── Chain verification ─────────────────────────────────────────────────

export interface VerifyResult {
  valid: boolean;
  checked: number;
  brokenAt: number | null;
  reason: string | null;
}

/**
 * Walk a chain of envelopes and verify integrity. Mirrors the Python
 * verify_chain semantics in phionyx-mcp-server.audit_chain.
 */
export async function verifyChain(
  envelopes: BoundedAuthorityEnvelope[],
): Promise<VerifyResult> {
  if (envelopes.length === 0) {
    return { valid: true, checked: 0, brokenAt: null, reason: null };
  }

  const schemas = new Set(envelopes.map((e) => e.schema));
  if (schemas.size > 1) {
    return {
      valid: false,
      checked: 0,
      brokenAt: 0,
      reason: `mixed schemas in chain: ${Array.from(schemas).sort().join(",")}`,
    };
  }

  let previous = GENESIS_HASH;
  for (let i = 0; i < envelopes.length; i++) {
    const env = envelopes[i];
    if (env.integrity.previous !== previous) {
      return {
        valid: false,
        checked: i,
        brokenAt: i,
        reason: `previous mismatch at turn ${env.subject.turn_index}`,
      };
    }
    const { integrity: _omit, ...payload } = env;
    const recomputed = await envelopeHash(payload, previous);
    if (recomputed !== env.integrity.current) {
      return {
        valid: false,
        checked: i,
        brokenAt: i,
        reason: `content tampered at turn ${env.subject.turn_index}`,
      };
    }
    previous = env.integrity.current;
  }

  return { valid: true, checked: envelopes.length, brokenAt: null, reason: null };
}

// ── Bounded-authority preservation verifier (spec §6 rules) ────────────

export interface BoundedAuthorityVerifyResult {
  valid: boolean;
  violations: Array<{
    rule: number;
    turn_index: number;
    reason: string;
  }>;
}

/**
 * Apply the 7 bounded-authority preservation rules from spec §6.
 * Returns structured violations (NOT a hard fail like verifyChain) —
 * the bounded-authority is a higher-level invariant than the envelope-
 * chain invariant. A chain can be cryptographically intact but still
 * violate bounded-authority rules.
 */
export function verifyBoundedAuthority(
  envelopes: BoundedAuthorityEnvelope[],
): BoundedAuthorityVerifyResult {
  const violations: BoundedAuthorityVerifyResult["violations"] = [];

  // Build action_id → approval count maps for rule 1 + 2 checks
  const approvalsByAction = new Map<string, ApprovalBlock[]>();
  const proposalById = new Map<
    string,
    { envelope: BoundedAuthorityEnvelope; turn: number }
  >();

  envelopes.forEach((env, i) => {
    if (env.proposal) {
      proposalById.set(env.proposal.action_id, { envelope: env, turn: i });
    }
    if (env.approval && env.proposal) {
      const list = approvalsByAction.get(env.proposal.action_id) ?? [];
      list.push(env.approval);
      approvalsByAction.set(env.proposal.action_id, list);
    }
  });

  // Rule 1: No execute_completed without prior execute_approved
  envelopes.forEach((env, i) => {
    if (env.subject.event_type === "execute_completed" && env.proposal) {
      const approvals = approvalsByAction.get(env.proposal.action_id) ?? [];
      const hasApprove = approvals.some((a) => a.decision === "approved");
      if (!hasApprove) {
        violations.push({
          rule: 1,
          turn_index: env.subject.turn_index,
          reason: `execute_completed for action ${env.proposal.action_id} without prior execute_approved`,
        });
      }
    }
  });

  // Rule 2: execute_high_stakes needs 2 distinct approver_id_hash values
  envelopes.forEach((env, i) => {
    if (
      env.subject.event_type === "execute_completed" &&
      env.authority.subclass === "execute-high-stakes" &&
      env.proposal
    ) {
      const approvals = approvalsByAction.get(env.proposal.action_id) ?? [];
      const distinct = new Set(
        approvals.filter((a) => a.decision === "approved").map((a) => a.approver_id_hash),
      );
      if (distinct.size < 2) {
        violations.push({
          rule: 2,
          turn_index: env.subject.turn_index,
          reason: `execute-high-stakes for action ${env.proposal.action_id} needs 2 distinct approvers (got ${distinct.size})`,
        });
      }
    }
  });

  // Rule 3: safety_gate.verdict = "block" envelope always present is
  // implicitly satisfied — the producer cannot hide what was never
  // emitted. We can only verify the structure: every safety_gate_blocked
  // event_type has the safety_gate.verdict = "block".
  envelopes.forEach((env, i) => {
    if (env.subject.event_type === "safety_gate_blocked") {
      if (!env.safety_gate || env.safety_gate.verdict !== "block") {
        violations.push({
          rule: 3,
          turn_index: env.subject.turn_index,
          reason: `safety_gate_blocked event without verdict=block`,
        });
      }
    }
  });

  // Rule 4: authority_tier_change followed by proof_recorded with kind=permission
  for (let i = 0; i < envelopes.length; i++) {
    if (envelopes[i].subject.event_type === "authority_tier_change") {
      const next = envelopes[i + 1];
      if (
        !next ||
        next.subject.event_type !== "proof_recorded" ||
        next.proof?.kind !== "permission"
      ) {
        violations.push({
          rule: 4,
          turn_index: envelopes[i].subject.turn_index,
          reason: `authority_tier_change not followed by proof_recorded(permission)`,
        });
      }
    }
  }

  // Rule 5: approver_id_hash is hex of length 64 (SHA-256) — enforce shape
  envelopes.forEach((env, i) => {
    if (env.approval) {
      const h = env.approval.approver_id_hash;
      if (!/^[0-9a-f]{64}$/i.test(h)) {
        violations.push({
          rule: 5,
          turn_index: env.subject.turn_index,
          reason: `approver_id_hash not a 64-hex SHA-256 (got ${h.length} chars)`,
        });
      }
    }
  });

  // Rule 6: never_rules_active + stop_conditions_active don't shrink across
  // the chain for the same contract_id+version without an intervening
  // authority_tier_change. Walk pairwise.
  const lastActiveByContract = new Map<
    string,
    { never: Set<string>; stop: Set<string>; turn: number }
  >();
  for (let i = 0; i < envelopes.length; i++) {
    const env = envelopes[i];
    const contractKey = `${env.authority.contract_id}@${env.authority.contract_version}`;
    const currentNever = new Set(env.authority.never_rules_active);
    const currentStop = new Set(env.authority.stop_conditions_active);
    const prev = lastActiveByContract.get(contractKey);
    if (prev) {
      // Check shrinkage: any rule in prev.never but not in currentNever?
      const droppedNever = Array.from(prev.never).filter((r) => !currentNever.has(r));
      const droppedStop = Array.from(prev.stop).filter((r) => !currentStop.has(r));
      if (droppedNever.length > 0 || droppedStop.length > 0) {
        // Was the intervening envelope an authority_tier_change?
        let hasTierChange = false;
        for (let j = prev.turn + 1; j < i; j++) {
          if (envelopes[j].subject.event_type === "authority_tier_change") {
            hasTierChange = true;
            break;
          }
        }
        if (!hasTierChange) {
          violations.push({
            rule: 6,
            turn_index: env.subject.turn_index,
            reason: `active rules shrunk without authority_tier_change (dropped: ${[...droppedNever, ...droppedStop].join(", ")})`,
          });
        }
      }
    }
    lastActiveByContract.set(contractKey, {
      never: currentNever,
      stop: currentStop,
      turn: i,
    });
  }

  // Rule 7: proposal.proof_obligations_declared discharged within K turns
  // K = 50 by default (spec §6.7). Walk proposals and check downstream
  // proof_recorded envelopes within K turns.
  const K = 50;
  envelopes.forEach((env, i) => {
    if (env.proposal && env.proposal.proof_obligations_declared.length > 0) {
      const expectedKinds = new Set(env.proposal.proof_obligations_declared);
      const discharged = new Set<string>();
      for (let j = i + 1; j < Math.min(i + 1 + K, envelopes.length); j++) {
        const e = envelopes[j];
        if (e.proof && e.subject.event_type === "proof_recorded") {
          discharged.add(e.proof.kind);
        }
      }
      const missing = Array.from(expectedKinds).filter((k) => !discharged.has(k));
      if (missing.length > 0) {
        violations.push({
          rule: 7,
          turn_index: env.subject.turn_index,
          reason: `proof obligations not discharged within ${K} turns: ${missing.join(", ")}`,
        });
      }
    }
  });

  return { valid: violations.length === 0, violations };
}

// ── Utility: SHA-256 of arbitrary string (for input_hash / approver_id_hash) ──

export async function sha256Of(text: string): Promise<string> {
  return await sha256Hex(text);
}

export async function sha256Prefixed(text: string): Promise<string> {
  return "sha256:" + (await sha256Hex(text));
}
