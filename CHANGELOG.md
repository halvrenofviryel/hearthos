# Changelog

All notable changes to HearthOS are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once it reaches 1.0.

## [Unreleased]

### Removed
- `apps/rpg` package and its `RPGQuestTheme` from `@hearthos/theme-sdk`. The RPG surface was a future-facing experiment; the bounded-authority pattern is fully demonstrable through `apps/chat` and the public demo without it. It will return as a separate project when its scope is genuinely ready.

### Changed
- `apps/console` is now a **read-only chat-control surface**. The `family/`, `themes/`, and `agents/new` routes have been removed; the `agents` and `agents/[id]` routes are read-only inspectors of the agent contracts that live in `@hearthos/core` seed data. A new `threads/` route surfaces the chat threads the orchestrator has opened. The dashboard now centres on chat overview rather than family management.
- Console sidebar subtitle changed from "Father Console" to the neutral "Chat Console". Sidebar items reduced from six to four (Dashboard, Threads, Agents, Activity).
- README updated to reflect the removal of `apps/rpg` and the simplification of `apps/console`. The "Public demo vs reference surfaces" section now lists only `apps/chat` and `apps/console` alongside `apps/demo`.
- Renamed the public demo's first module from **Diagnostic** to **Household Check** (route `/diagnostic` → `/household-check`; the old route 301-redirects on phionyx.ai). "Diagnostic" read as a clinical claim the demo does not make; "Household Check" matches what the module is — a 3-minute household self-check. The pinned reference trace was regenerated to match (`demo-household-check-v1.jsonl`).

### Added
- `docs/PHIONYX_PROFILES.md` — a map of how HearthOS demonstrates two Phionyx runtime profiles (the **Safety Gate** and the **Evidence** profile), with a code tour and explicit boundaries.
- `services/api` test suite — **15 Supertest integration tests across 4 files** covering `/api/health`, `/api/agents` (list / filter / single / 404), `/api/threads` (list / create / read / messages), `/api/audit`, `/api/plans`, and `/api/family/members`. Total workspace test count: **174 tests** (159 core + 15 API).
- `CONTRIBUTING.md` — what is in / out of scope, repo layout, development setup, coding conventions, test instructions, scope-bounds.
- `SECURITY.md` — scope, supported versions, reporting process, soft guarantees the project will defend.
- `CHANGELOG.md` — this file.

### Fixed
- `apps/chat` and `apps/rpg` (now removed) had inconsistent dev-script ports: `apps/chat` ran on `:3100` in dev but `:3000` in start; `apps/rpg` ran on `:3011` / `:3001`. The remaining `apps/chat` dev script now matches its start script (both `:3000`) and the README ports.

### Notes
- Pre-1.0 — every release is breaking until 1.0. Do not depend on internal APIs you cannot see from `@hearthos/core/index.ts`.
- `services/api/prisma/dev.db` is git-ignored. Run `pnpm db:push && pnpm db:seed` to populate it before running chat / console / API tests.

## [0.1.0] — initial pre-public preparation (2026-05)

### Added
- `@hearthos/core` — domain logic with zero external runtime dependencies. Exposes `PolicyEngine`, `ConversationOrchestrator`, `CoursePlanner`, `AuditLogger`, `MemoryPortfolio`, `MockLLMAdapter`, `OllamaAdapter`, seed data, types.
- `@hearthos/core` — Phionyx-Lite gates: `evaluateInputSafety` (four sensitive categories) and `evaluateApproval` (three-tier EXECUTE sub-classification).
- `@hearthos/core` — `HouseholdState` primitive (load / friction / clarity / fatigue / risk) with banding helpers and a dominant-concern selector.
- `@hearthos/core` — `ActivityStream` (the family-facing event stream) and the `fromAuditEntry` adapter from the legacy `AuditLogger` shape.
- `@hearthos/core` — `StaffAgent.uiLabel` optional field for neutral public-facing labels. Code canon names (Steward, Nanny-Coach, Butler, …) are preserved; the demo UI uses the labels.
- `apps/demo` — public, browser-only demo on port 3300. Three screens: Diagnostic, Weekly Reset (with interactive parent-approval queue + print stylesheet), Boundary Script (eight categories × six scripts, with sensitive-input safety banner + generic-fallback banner).
- `apps/demo` — `EmailCapture` component with waitlist framing (the kit itself is a forthcoming PDF; the form collects emails in `localStorage` and is wired for a future provider integration).
- 159 unit tests across 10 files for `@hearthos/core`.
- CI workflow (`.github/workflows/ci.yml`) — Node 20 / 22 matrix, install + tsc-all + core tests.

### Documentation
- `README.md` — full repository orientation: positioning, architecture, packages, prerequisites, setup, development, public demo, testing, API endpoints, design principles, Phionyx-Lite acknowledgement, "What HearthOS is NOT".
- `LICENSE` — AGPL-3.0.

### Notes
- HearthOS is positioned as a reference implementation, not a product, not a hosted service, not a certified system.
- The public funnel surface is `apps/demo`. The reference surfaces are `apps/chat` and `apps/console`. They share the same `@hearthos/core` domain.
