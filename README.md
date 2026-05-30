# HearthOS

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/tests-174_passing-success)](#testing)
[![Demo](https://img.shields.io/badge/demo-phionyx.ai%2Fhearthos-7E5FA0)](https://phionyx.ai/hearthos)
[![Pillar](https://img.shields.io/badge/pillar-Bounded_Authority-A75A2F)](https://phionyx.ai/bounded-authority)
[![Kindle](https://img.shields.io/badge/Kindle_Book-HearthOS-FF9900?logo=amazon&logoColor=white)](https://www.amazon.co.uk/dp/B0GX2WJY77)
[![Related: phionyx-research](https://img.shields.io/badge/related-phionyx--research-1f242a?logo=github)](https://github.com/halvrenofviryel/phionyx-research)

> **HearthOS helps families turn daily chaos into clear routines, safe boundaries, and parent-approved decisions.**
>
> Most AI assistants answer. HearthOS separates suggestion from authority — every output is a proposal; only the parent executes.
>
> *Powered by bounded-authority AI orchestration.*

> 🧭 **Where this fits on [phionyx.ai](https://phionyx.ai):** HearthOS surfaces under [**phionyx.ai/bounded-authority**](https://phionyx.ai/bounded-authority) as the household-scale demonstration of the bounded-authority pattern. The same primitives — scope, safety, ethics, state, approval, audit — appear at full fidelity across three distinct, separately-versioned upstream artefacts: the **engine** [`phionyx-core`](https://github.com/halvrenofviryel/phionyx-research) (the deterministic-cognition SDK; the 46-block canonical pipeline), the **self-governance gate** [`phionyx-pipeline-mcp`](https://pypi.org/project/phionyx-pipeline-mcp/) (the MCP server that verifies an agent's own claims against git-diff truth), and the vendor-neutral **Evaluation Standard** [`phionyx-evaluation-standard`](https://github.com/halvrenofviryel/phionyx-research) (the L0–L3 / D0–D3 / CG-L0…CG-L5 scales). HearthOS itself is a browser-only TypeScript reference app — it does **not** import any of those at runtime. See [phionyx.ai/sdk](https://phionyx.ai/sdk) for the engine and [phionyx.ai/maturity](https://phionyx.ai/maturity) for the gate and the claim-governance ladder.

HearthOS is a reference implementation of a bounded-authority household AI orchestration model: ten named agents, a three-tier policy engine (READ / PROPOSE / EXECUTE), explicit safety and approval gates, and a family-readable activity history. Built in TypeScript, runs offline by default with a deterministic mock LLM adapter, and ships a small public demo (Diagnostic / Weekly Reset / Boundary Script) that demonstrates the pattern in three minutes.

It is intentionally **not** a product, not a hosted service, and not certified for any regulatory regime. It is a reference application — the kind of thing you read, run locally, fork, and adapt.

## Public demo vs reference surfaces

`apps/demo` is the public-facing HearthOS funnel — three browser-only screens (Diagnostic, Weekly Reset, Boundary Script) designed for families and reachable from `phionyx.ai/hearthos`. No database, no API, no LLM. It runs entirely in the browser session.

`apps/chat` and `apps/console` are **reference surfaces** for developers and reviewers who want to inspect how the orchestrator, theme SDK, agent contracts, and chat-control console fit together on top of the same `@hearthos/core` package. They are not production services and they are not part of the public funnel.

If you are evaluating HearthOS as a family-tech demo, start with `apps/demo`. If you are evaluating it as a reference implementation of bounded-authority orchestration, the more revealing reading order is `packages/core` → `apps/chat` → `apps/console` → `services/api`.

## Architecture

```
hearthos/
├── apps/
│   ├── demo/          # Public demo — Diagnostic, Weekly Reset, Boundary Script (port 3300)
│   ├── chat/          # Vivid Chat theme — full orchestrator UI (port 3000)
│   └── console/       # Read-only chat-control console (port 3200)
├── packages/
│   ├── core/          # Domain logic: policy engine, planner, orchestrator, audit log,
│   │                  #   Phionyx-Lite gates, HouseholdState, activity stream, seed data
│   └── theme-sdk/     # Theme plugin contract + the Vivid Chat theme
└── services/
    └── api/           # REST API with Prisma + SQLite for development (port 4000)
```

### Packages

- **`@hearthos/core`** — domain logic with **zero runtime dependencies**. Exposes:
  - `PolicyEngine` — three-tier READ / PROPOSE / EXECUTE evaluation with sub-classification of EXECUTE into routine / review / high-stakes.
  - `ConversationOrchestrator` — policy-gated, audit-traced conversation flow.
  - `CoursePlanner` — Light / Standard / Ambitious weekly course plans with fatigue penalty + schedule conflict detection.
  - `AuditLogger` — sequential per-action log (legacy shape).
  - `ActivityStream` — the richer, family-facing event stream (the *"activity history"* you see in the demo).
  - `HouseholdState` — five family-readable signals (load / friction / clarity / fatigue / risk) and their banding helpers.
  - `evaluateInputSafety` + `evaluateApproval` — the **Phionyx-Lite gates**: sensitive-area detection and parent-approval routing.
  - `MockLLMAdapter` — deterministic, offline-runnable adapter. No API key required.
  - `OllamaAdapter` — optional adapter for a local Ollama daemon.
- **`@hearthos/theme-sdk`** — theme plugin contract; ships the Vivid Chat theme used by `apps/chat`.
- **`@hearthos/api`** — Express REST API with Prisma + SQLite. Endpoints listed below.

### Seed Data

- **Family:** The Hearth Family (David & Maria, parents; Lily, 8; Max, 12).
- **Ten staff agents** — six front-stage, four back-stage. Each ships a static `AgentContract` declaring its purpose, allowed read/propose surfaces, never-rules, stop-conditions, and proof obligations. The code keeps the canonical names (Steward, Nanny-Coach, Butler, …) and the UI surfaces neutral labels via `StaffAgent.uiLabel` (Family Coordinator, Child Growth Coach, …).

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9

## Setup

```bash
pnpm install
pnpm db:generate
pnpm db:push
pnpm db:seed
```

## Development

```bash
# Start every app + the API in parallel
pnpm dev
```

This runs:

- **Demo** (the public funnel) — http://localhost:3300
- **Vivid Chat** — http://localhost:3000
- **Chat Console** — http://localhost:3200
- **REST API** — http://localhost:4000

Just want the public demo? `pnpm --filter @hearthos/demo dev` brings up only `apps/demo`. The demo has zero runtime data requirements — no DB seed needed, nothing leaves the browser.

## Public Demo (`apps/demo`)

Three browser-only screens that demonstrate the bounded-authority pattern in three minutes:

| Route | What it does | Typical run time |
|---|---|---|
| `/diagnostic` | Twelve quick questions → a five-dimensional `HouseholdState` (load / friction / clarity / fatigue / risk) and a single recommended next move. | ≈ 3 min |
| `/weekly-reset` | Generates the week's three priorities, three child tasks, meal rhythm, risks to watch, and an explicit **parent-approval queue** ("these decisions should not run on autopilot"). | ≈ 5 min |
| `/boundary-script` | Describe a recurring tough moment in one line → three matched scripts (soft / firm / repair). Inputs touching sensitive areas trigger the **input-safety gate**, which surfaces a visible "this needs explicit parent approval" banner. | ≈ 2 min |

No account. No personal child names required. All inputs stay in the browser session unless you choose to copy them out.

## Testing

```bash
pnpm test
```

Runs the test suites for every workspace package that defines one. As of this release that is **174 tests** across two packages:

- **`@hearthos/core`** — 159 unit tests across 10 files: policy engine, course planner, audit log, memory portfolio, mock LLM adapter, conversation orchestrator, `HouseholdState`, input-safety gate, human-approval gate, and the activity stream + legacy `fromAuditEntry` adapter.
- **`@hearthos/api`** — 15 integration tests across 4 files (Supertest against the live Express app): `/api/health`, `/api/agents` (list, filter, single, 404), `/api/threads` (list / create / read / messages), `/api/audit`, `/api/plans`, `/api/family/members`. The API tests require a seeded `dev.db` — run `pnpm db:push && pnpm db:seed` first.

Tests run in well under two seconds on a clean install.

```bash
# Per-package
pnpm --filter @hearthos/core test
pnpm --filter @hearthos/api test

# Type-check every package
pnpm --filter @hearthos/core exec tsc --noEmit
pnpm --filter @hearthos/api exec tsc --noEmit
pnpm --filter @hearthos/demo exec tsc --noEmit
pnpm --filter @hearthos/chat exec tsc --noEmit
pnpm --filter @hearthos/console exec tsc --noEmit
pnpm --filter @hearthos/theme-sdk exec tsc --noEmit
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/health` | Health check |
| GET    | `/api/threads` | List threads (query: `familyId`) |
| POST   | `/api/threads` | Create thread |
| GET    | `/api/threads/:id/messages` | List messages |
| POST   | `/api/threads/:id/messages` | Send message (auto-generates an AI response) |
| GET    | `/api/plans` | List plans (query: `familyId`, `memberId`, `status`) |
| POST   | `/api/plans` | Create plan |
| PATCH  | `/api/plans/:id` | Update plan status |
| POST   | `/api/capture` | Capture memory entry |
| GET    | `/api/capture/:memberId` | List member memories |
| GET    | `/api/course-plans` | Generate / list course plans |
| POST   | `/api/course-plans` | Save a course plan |
| GET    | `/api/weekly-report` | Generate weekly family report |
| GET    | `/api/audit` | List audit log entries |

## Design Principles

1. **Chat-first.** Human interaction is the primary surface; orchestration happens behind the scenes.
2. **Theme-agnostic core.** All domain logic lives in `@hearthos/core`; themes are skins.
3. **Policy-gated.** Every action passes through READ / PROPOSE / EXECUTE evaluation before it lands.
4. **Bounded authority.** AI proposes; only the parent executes. High-stakes actions block until approved.
5. **Offline-capable.** A deterministic mock LLM adapter ships in core — no API key, no network call.
6. **Auditable.** Every significant action emits an entry; the public-facing UI surfaces these as *activity history*.

## Phionyx-Lite

A handful of gates in `@hearthos/core` (`gates/input-safety-gate.ts`, `gates/human-approval-gate.ts`) are inspired by — but **not the same as** — the upstream Phionyx artefacts, each of which is a separate project with its own version line:

- **Engine** — [`phionyx-core`](https://github.com/halvrenofviryel/phionyx-research) (the deterministic-cognition SDK): the full **46-block canonical pipeline (contract v3.8.0)**, the physics-based state telemetry, and the signed audit chain. HearthOS imports **none** of these.
- **Self-governance gate** — [`phionyx-pipeline-mcp`](https://pypi.org/project/phionyx-pipeline-mcp/): the MCP server that verifies an agent's own "I fixed / I tested / this changed" claims against git-diff truth. This is the component the claim-governance ladder (CG-L0…CG-L5) rates — distinct from the SDK and from HearthOS.
- **Evaluation Standard** — [`phionyx-evaluation-standard`](https://github.com/halvrenofviryel/phionyx-research): the vendor-neutral spec that defines the L0–L3 (evaluation maturity), D0–D3 (determinism), and CG-L0…CG-L5 (claim-governance) scales against which any runtime can be placed.

HearthOS does not import the full 46-block pipeline, the physics telemetry, or the signed audit chain. Those live in the separate `phionyx-research` ecosystem above.

A future `@hearthos/phionyx-adapter` package (not yet built) is the planned home for opt-in hash-chained activity export and richer telemetry integration. Until that ships, the activity stream here is a programmatic journal — useful for in-process audit, not a tamper-evident chain.

## What HearthOS is NOT

These bounds are load-bearing — treat them as part of the design, not as marketing hedges:

- Not a product, not a hosted service, not certified.
- Not multi-tenant. The schema assumes one family per database.
- Not authenticated. The REST API ships with no auth middleware; bounded-authority lives at the application layer, not the transport.
- Not encrypted at rest. SQLite is plaintext on disk; suitable for development only.
- Not tamper-evident. The activity stream is in-process state; cryptographic chaining is reserved for the (not-yet-built) Phionyx adapter.
- Not a clinical, therapeutic, or smart-home tool.
- Not battle-tested. No third-party security review, no large-scale deployment, no extended field-test data.

If a guarantee you need is missing from this list, write to founder@phionyx.ai — we will tell you what we have, what we don't, and what is on the roadmap.

## License

**AGPL-3.0** — see [LICENSE](LICENSE).

A commercial license is available for use cases where AGPL-3.0 copyleft is unsuitable. Contact for details.

---

*Reference application inspired by the bounded-authority principles of [phionyx-research](https://github.com/halvrenofviryel/phionyx-research).*
