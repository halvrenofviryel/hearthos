# Contributing to HearthOS

Thanks for taking an interest. HearthOS is a small reference implementation of a bounded-authority household AI orchestration model; contributions that preserve that shape and tighten its honesty are welcome.

## What kind of changes are in scope

| ✅ Welcome | ⚠️ Discuss first | ❌ Out of scope |
| --- | --- | --- |
| Bug fixes in `packages/core` | Adding a new agent role | Removing the bounded-authority pattern |
| New unit tests for existing modules | Expanding the policy engine sub-class list | Hosted SaaS / multi-tenant work |
| Boundary-script content additions | A second LLM adapter | Auth, encryption, production-tooling additions to the demo |
| Documentation improvements | A new public demo screen | "AI that runs the family" features |
| Accessibility fixes | Translating the demo to another language | Marketing copy that overclaims what HearthOS does |

If a change is in the "discuss first" column, please open an issue before writing code so we can agree on shape and scope.

## Repository layout

See [`README.md` § Architecture](README.md#architecture) for the full map. Quick summary:

- `packages/core` — domain logic. Zero runtime dependencies. **All non-trivial behaviour changes belong here**, not in apps or routes.
- `packages/theme-sdk` — theme plugin contract.
- `apps/demo` — public, browser-only demo. No DB, no API, no LLM.
- `apps/chat` — reference chat UI driven by `theme-sdk`.
- `apps/console` — read-only chat-control surface. No edit / create / delete actions land from this app.
- `services/api` — Express + Prisma + SQLite REST layer (dev-grade).

## Development

```bash
git clone <fork-url> hearthos
cd hearthos
pnpm install --frozen-lockfile

# DB only required for chat / console / api
pnpm db:generate
pnpm db:push
pnpm db:seed

# Run everything in parallel
pnpm dev
```

## Coding conventions

- **TypeScript strict** across every workspace package. `tsc --noEmit` must be clean before a PR.
- **No external runtime dependencies in `@hearthos/core`.** Domain logic stays portable.
- **The bounded-authority pattern is load-bearing.** Any new route, agent, or surface must respect `PolicyEngine`'s tier decision; do not duplicate gate logic in a route handler.
- **Tests are the contract.** Add unit tests for every new core module; add integration tests for every new API route.
- **English in code and UI.** This applies to comments, identifiers, JSX text, seed data, and prompts. The project has been deliberately translated; please do not regress.
- **No personal information in commits.** Seed data uses the fictional Hearth Family; please do not add real names, emails, or family detail.

## Running the test suite

```bash
pnpm test                    # all packages with a test script (currently core + api)

pnpm --filter @hearthos/core test     # unit tests only
pnpm --filter @hearthos/api test      # API integration tests (Supertest)
```

API tests assume a seeded `dev.db`. If you've wiped it (or never run `db:seed`), the API agents test will fail with a clear instruction.

## Submitting a change

1. Open an issue (or comment on an existing one) describing the change.
2. Branch from `main`. Keep changes scoped to a single concern.
3. Add or update tests.
4. Run `pnpm test` and `tsc --noEmit` for every package you touched.
5. Open a PR. Reference the issue.

## What HearthOS will not become

These bounds are part of the design:

- Not a hosted service or product.
- Not an auth or identity system.
- Not a clinical, therapeutic, or psychological tool.
- Not a substitute for parent judgement.
- Not a clone of `phionyx-research`. HearthOS borrows two lightweight gates from the Phionyx-Lite vocabulary; it does not implement Phionyx's full 46-block pipeline.

Contributions that drift toward any of these will be returned with an explanation.

## License

By contributing, you agree your contribution is licensed under [AGPL-3.0](LICENSE).
