# Validation Obligations

This directory is AI-derived from `/KERNEL/`.

## Required Gates

- Existing tests must pass before work is marked complete.
- New high-value tests should be added for changed behavior.
- TLA+ models must generate at least one state; a zero-state TLC run is a failure.
- Any unverifiable requirement must be escalated rather than silently implemented.

## TLA+ Checks

Run from the repository root:

```bash
cd KERNEL
rtk uv run tla tlc ../SPEC/tla/LinksKernelAll
rtk uv run tla tlc ../SPEC/tla/LinksKernelFiltered
rtk uv run tla tlc ../SPEC/tla/LinksKernelSources
rtk uv run tla tlc ../SPEC/tla/LinksKernelChat
```

Expected result:

- TLC completes with all listed invariants satisfied.
- TLC reports at least one generated state for each model.

## App Checks

Run from `app/`:

```bash
rtk npm test
rtk npm run test:vitest
```

Add or update tests in the smallest relevant layer before implementation changes.

Jev compatibility tests must verify that the app emits the native Decisions
Choice shape, reserves one of at most `255` options for `none_of_the_above`,
requires typed Choice answers, resolves IDs against loaded links before ranking,
and recommends only grounded candidates that beat the no-match probability.

## Worker Checks

Run from the repository root:

```bash
rtk node --test functions/chat/cors.test.mjs
```

Expected result:

- `/links/chat` preflight allows only exact configured origins.
- disallowed origins are rejected without wildcard CORS headers.
- unexpected requested headers are rejected.
- successful chat responses include only exact-origin CORS headers.
