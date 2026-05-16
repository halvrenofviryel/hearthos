# Security Policy

## Scope

HearthOS is a **reference implementation**, not a hosted service. It ships with deliberate dev-grade defaults (no auth, no encryption at rest, no rate limiting). Issues that boil down to "HearthOS does not have auth" are not security vulnerabilities — they are part of the documented scope. See [`README.md` § "What HearthOS is NOT"](README.md#what-hearthos-is-not) for the full list.

This security policy covers genuine vulnerabilities in code that the project does claim to support:

- The `@hearthos/core` domain logic (PolicyEngine, gates, orchestrator, audit / activity log).
- The Phionyx-Lite gates (`evaluateInputSafety`, `evaluateApproval`) and their classification.
- The `@hearthos/api` REST layer (request handling, Prisma queries, route mounting).
- The `apps/demo` public surface (XSS, prompt injection via demo inputs, etc.).

Issues outside this scope (multi-tenant isolation, auth bypass when auth was never implemented, encrypted-at-rest when it was never claimed) are not in scope and should be filed as feature requests, not security reports.

## Supported versions

HearthOS is pre-1.0. Only `main` is supported; please reproduce against the latest commit before reporting.

## Reporting a vulnerability

**Do not open a public issue** for security problems.

Email `founder@phionyx.ai` with:

1. A short description of the issue.
2. A minimal reproduction (steps, code, or a failing test).
3. The commit you reproduced against.
4. Your assessment of impact (low / medium / high) and any disclosure preference.

You should expect:

- Acknowledgement within 7 days.
- A first triage response (accept / decline / need more info) within 14 days.
- A coordinated disclosure timeline if the issue is accepted; no public attribution without your consent.

## What we will not pay

HearthOS does not run a bug bounty. Reporters who want public acknowledgement on a fix commit are welcome to ask for it.

## Soft guarantees we will defend

Even though HearthOS is dev-grade, we treat the following as load-bearing and will treat genuine breaks as security issues:

- **The PolicyEngine never allows a child to execute.** Test: `packages/core/tests/policy.test.ts` covers the matrix.
- **The input-safety gate flags every sensitive category it claims to.** Test: `packages/core/tests/input-safety-gate.test.ts`.
- **The mock LLM adapter is deterministic.** Test: `packages/core/tests/mock-adapter.test.ts`.
- **The activity stream's `getRequiringApproval` returns only items marked `approval_required: true`.** Test: `packages/core/tests/activity-stream.test.ts`.
- **No personal information is hard-coded in seed data.** The Hearth Family is fictional canonical seed; if a real family detail leaks in, that is a project policy break and we will treat it as such.

## Dependency hygiene

We rely on the following posture rather than active scanning:

- `pnpm install --frozen-lockfile` for reproducible installs.
- No external runtime dependencies in `@hearthos/core`.
- Apps and services minimise their dependency surface (Next.js, React, Express, Prisma, plus types).

A reviewer who finds an outdated transitive dependency with a known CVE is welcome to file an issue or open a PR.
