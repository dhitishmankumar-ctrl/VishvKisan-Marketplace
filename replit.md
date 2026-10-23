# VishvKisan Marketplace

VishvKisan connects farmers and customers, with a supplier portal for crop batches, regional logistics hubs, and illustrative price-compression guidance.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Web preview: `pnpm --filter @workspace/vishvkisan run dev`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/vishvkisan/index.html` — original marketplace page and visual shell
- `artifacts/vishvkisan/marketplace.js` — shared listing, storage point, supplier form, and price guidance behavior
- `artifacts/api-server/src/routes/marketplace.ts` — marketplace endpoints and illustrative pricing calculation
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `lib/db/src/schema/marketplace.ts` — storage point, listing, and demo-order schema

## Architecture decisions

- Farmer inventory and logistics assignments are stored in PostgreSQL and shared with the customer catalog.
- Storage fees are configured per quintal; the price guide scales them for ton-based listings.
- The market caps and OTP/login flow are demonstrations, not a live market feed or real authentication.

## Product

Farmers enter a B2B supplier dashboard to create crop batches, select a logistic storage point, track listings, and see price compression after storage fees. Customers have a separate local-produce catalog and demo order flow.

## User preferences

- Preserve the existing visual shell: do not change global backgrounds, fonts, button alignments, or other styling.
- Keep the consumer shopping cart out of the Farmer Login experience.

## Gotchas

- Rerun API code generation after changing `lib/api-spec/openapi.yaml`.
- Demo login does not verify identity or listing ownership; do not treat this prototype as production-secure.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
