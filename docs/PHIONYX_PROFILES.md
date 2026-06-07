# HearthOS as a worked example of two Phionyx runtime profiles

**In one line:** HearthOS is the bounded-authority pattern that Phionyx
formalizes, made concrete at household scale. Two of Phionyx's runtime
profiles show up here in full — the **Safety Gate** and the **Evidence**
profile — and you can watch both of them run in the [browser
demo](https://phionyx.ai/hearthos).

This document maps each part of the HearthOS code onto the profile it
demonstrates, and is honest about where the resemblance stops.

---

## What a "runtime profile" is

Phionyx is not one monolith. It is a deterministic runtime that you deploy
as a **profile** — a named subset of governance behaviour for the job in
front of you. Three profiles are documented at
[phionyx.ai/profiles](https://phionyx.ai/profiles):

| Profile | One-line job |
|---|---|
| **Evidence** (the notary) | Turn every decision into a signed, replayable record; tampering at any link is detected. |
| **Abstention & Boundary** (the boundary) | When the system can't evidence an answer, hedge / ask / defer / refuse — with a calibrated confidence, not a guess. |
| **Safety Gate** (the gate) | A fail-closed gate between model output and action, with escalation to a human. |

HearthOS demonstrates **two** of them — Safety Gate and Evidence — because
those are the two that a family actually needs to *see* working.

---

## The mapping

HearthOS is a standalone TypeScript app. It does **not** import
`phionyx-core`. What it does is implement the same primitives the profiles
describe, in code you can read in one sitting.

### Safety Gate profile — the boundary

> *A fail-closed gate sits between the model's suggestion and any action;
> sensitive decisions escalate to a human.*

| Phionyx primitive | HearthOS file | What it does | What you see in the demo |
|---|---|---|---|
| Input safety gate | [`packages/core/src/gates/input-safety-gate.ts`](../packages/core/src/gates/input-safety-gate.ts) | Detects sensitive areas (money, health/school, external-share, child decisions) by deterministic keyword categorisation — no LLM — and flags them as `parent_approval_required`. | In **Boundary Script**, type a line mentioning money or a doctor → the gate fires, shows the rationale, and marks the proposal *"needs explicit parent approval."* |
| Human-in-the-loop / approval routing | [`packages/core/src/gates/human-approval-gate.ts`](../packages/core/src/gates/human-approval-gate.ts) | Maps the policy engine's EXECUTE sub-class (`execute-now` / `-with-review` / `-high-stakes`) to a UX urgency: `auto` / `review` / `block-until-approved`. High-stakes blocks until a parent approves. | High-stakes actions in **Weekly Reset** land in an explicit parent-approval queue instead of running. |
| Bounded authority tiers | [`packages/core/src/policy/engine.ts`](../packages/core/src/policy/engine.ts) | Three-tier READ / PROPOSE / EXECUTE evaluation. The AI lives at PROPOSE; only the parent moves anything to EXECUTE. | Every proposal is labelled with its tier; nothing executes from the AI side. |

**Fail-closed, made visible.** The point of the HearthOS version is not
that it is sophisticated — it is keyword-simple on purpose. The point is
that the boundary is *visible*: the family sees exactly when a proposal
touches something that should never run on autopilot.

### Evidence profile — the notary

> *Each decision becomes a signed, hash-chained record; tampering is detected;
> the record — not the model's word — is the account of what happened.*

| Phionyx primitive | HearthOS file | What it does | What you see in the demo |
|---|---|---|---|
| Signed, hash-chained record | [`apps/demo/lib/phionyx/envelope.ts`](../apps/demo/lib/phionyx/envelope.ts) | Builds a `phionyx.bounded_authority_envelope.v1` record per step: canonical JSON → SHA-256 chain (`integrity.current = SHA-256(canonical_json({record, previous}))`) → HMAC-SHA-256 signature. | Each module shows a growing **bounded-authority audit chain**; the latest envelope's hash is displayed. |
| Tamper-evident verification | `verifyChain()` in the same file | Walks the chain, recomputes each hash, and reports the exact turn where `previous` or content was altered. | **Download the `.jsonl`**, change one byte, re-verify → the chain names the broken step. |
| Bounded-authority preservation | `verifyBoundedAuthority()` in the same file | Applies 7 structural rules (e.g. no `execute_completed` without a prior `execute_approved`; high-stakes needs two distinct approvers; a `safety_gate_blocked` event must carry `verdict: "block"`). | The record isn't just intact — it's *checked against the rules the system claimed to follow*. |
| Cross-runtime canonical form | `canonicalJson()` in the same file | Byte-identical with the Python `canonical_json` helper used in the Phionyx tooling. | The records HearthOS emits in your browser can be verified by the **Python** Phionyx verifier — same bytes, two languages. |

---

## Where the resemblance stops (read this)

HearthOS is a reference app, not a Phionyx deployment. Being precise about
this is part of the design:

- **HearthOS imports no Phionyx package at runtime.** The gates and the
  envelope library are independent TypeScript that mirror the *pattern*, not
  the upstream code.
- **The demo signs with a published all-zeros HMAC key.** That gives you
  *replay reproducibility* (anyone can re-verify), **not** unforgeability.
  Production signing in Phionyx uses Ed25519, where the public key alone is
  enough to verify and the private key never ships.
- **The full Phionyx runtime is more.** The 46-block canonical pipeline
  (contract v3.8.0), the physics-based state telemetry, the kill switch, the
  deliberative-ethics gate, and the Ed25519 signed audit chain live in
  [`phionyx-core`](https://github.com/halvrenofviryel/phionyx-research) — not
  here. HearthOS shows two profiles' *behaviour*; it is not the engine.
- **`@hearthos/core`'s `ActivityStream` is an in-process journal**, not a
  cryptographic chain. The signed chain lives in the demo's envelope library.

If a guarantee you need isn't on this page, it probably isn't here — check
the [README](../README.md)'s "What HearthOS is NOT" section, which is
load-bearing, not marketing hedging.

---

## A 20-line tour of the Evidence profile

```ts
import {
  buildBoundedAuthorityEnvelope,
  verifyChain,
  GENESIS_HASH,
} from './apps/demo/lib/phionyx/envelope'

// 1. Build a signed record for one decision. The chain starts at GENESIS_HASH.
const env = await buildBoundedAuthorityEnvelope(ctx, GENESIS_HASH, '0.1.0')
//   env.integrity.current   → "sha256:25c8ceab…"   (this record's hash)
//   env.integrity.previous  → "sha256:0000…0000"   (genesis)
//   env.integrity.signature → "hmac-sha256:453d…"  (replay-verifiable)

// 2. Anyone can re-verify the whole chain offline — no server, no key escrow.
const result = await verifyChain([env /* …, env2, env3 */])
//   { valid: true, checked: 1, brokenAt: null, reason: null }

// 3. Tamper with one byte of any record and re-verify:
//   { valid: false, brokenAt: 2, reason: "content tampered at turn 2" }
```

That is the whole Evidence profile in miniature: **the record is the
account of what happened, and it tells you when someone changed it.**

---

*See it run: [phionyx.ai/hearthos](https://phionyx.ai/hearthos) ·
The profiles, formally: [phionyx.ai/profiles](https://phionyx.ai/profiles) ·
The engine: [phionyx-core](https://github.com/halvrenofviryel/phionyx-research)*
