# Repository Guidelines

## Project Structure & Module Organization
- **app/** contains Remix routes, loaders, and UI components. Key webhooks live in `app/routes/webhooks.*.tsx`, while reusable Shopify helpers are in `app/services/`.
- **extensions/** hosts Shopify app extensions (e.g., `extensions/early-access-gate/` for theme assets and `extensions/points-discount/` for the discount function). Each extension ships with its own build pipeline.
- **public/** and extension asset folders hold static files delivered to themes or embeds.
- **docs/** and **scaffolds/** capture setup notes and template snippets for internal workflows.

## Build, Test, and Development Commands
- `pnpm shopify app dev` – boots the Remix dev server, establishes the tunnel, and hot-reloads extensions.
- `pnpm build` – produces the production bundle consumed by `shopify app deploy`.
- `pnpm lint` – runs ESLint with cached output; resolve all warnings before pushing.
- `pnpm --filter points-discount exec graphql-codegen` – regenerates typed inputs/outputs after editing any discount function GraphQL schema.

## Coding Style & Naming Conventions
- TypeScript/TSX uses two-space indentation and obeys the repo ESLint/Prettier config. Run `pnpm lint --fix` for automatic formatting.
- Components stay PascalCase, helpers camelCase, and metafield keys snake_case (e.g., `loyalty_points_refunded`).
- GraphQL queries live in template literals prefixed with `#graphql` to keep codegen compatible and readable.

## Testing Guidelines
- Automated tests are not yet wired in. When adding suites, colocate them beside the feature (e.g., `app/routes/foo.test.ts`) and expose a `pnpm test` script.
- Perform manual verification with bogus orders: confirm discount application, metafield updates, and Theme Editor styling under different Shopify themes.

## Commit & Pull Request Guidelines
- Write imperative, focused commits such as `Debit points on orders/paid`. Avoid bundling unrelated refactors or lockfile updates.
- PR descriptions should summarize the merchant-facing change, list manual test steps, and flag required Shopify scope or webhook changes. Attach screenshots or theme preview links for UI adjustments.
- Before requesting review, ensure `pnpm lint` passes, regenerate any GraphQL artifacts, and verify the dev shop reflects the intended behaviour.

---

## Current Audit Findings (2025-05)

### Strengths we should preserve
- Discount function normalises ladder input, caps amounts, and applies both percentage and fixed discounts safely across cart lines (`extensions/points-discount/src/index.ts`).
- Orders paid/refunds webhooks share resilient helpers to reconcile redeemed/refunded points and persist detailed order metafields (`app/routes/webhooks.orders.paid.tsx`, `app/routes/webhooks.refunds.create.tsx`).
- Theme app extension delivers bilingual messaging, theme-aware styling hooks, and solid early-access UX scaffolding (`extensions/early-access-gate/blocks/early-access-message.liquid`).

### Critical issues / blockers
- Flow action endpoint authenticates with `authenticate.admin` and returns plain JSON; Shopify Flow expects Flow-specific auth + `{actions, errors}` envelope, so every recipe in `docs/Flow.md` fails today (`app/routes/api.flow.adjust-points.ts`).
- Dev + Docker tooling rely on npm commands (`shopify.web.toml`, `Dockerfile`) while the project uses pnpm and has no `package-lock.json`, so local dev and CI builds break when npm is invoked.
- Pending Flow connector manifest is unusable: `extensions/perq-adjust-points-action/shopify.extension.toml` lacks input schema and success/error surface, so the custom action cannot be added inside Shopify Flow.

### Major quality risks
- Dashboard loader double-counts revenue (adds order totals and quantities) and lacks null-guards, leading to misleading KPIs and potential runtime crashes if GraphQL returns errors (`app/routes/app._index.tsx`).
- Settings metafield button triggers duplicate POSTs by calling `fetcher.submit` inside a `<fetcher.Form>` `onSubmit`, causing duplicate writes and redundant toasts (`app/routes/app.settings.tsx`).
- Theme gating defaults to `999999` points when metafields are absent and emits verbose console logs to shoppers, effectively blocking access for stores that haven’t configured thresholds (`extensions/early-access-gate/blocks/early-access-gate.liquid`).

### Additional gaps to track
- GDPR webhooks log TODOs instead of actually exporting or deleting data, so mandatory data-handling requirements are unmet (`app/routes/webhooks.gdpr.tsx`).
- Billing/AppSubscription scaffolds mentioned in docs are absent; there is no pricing surface or paywall logic anywhere in the Remix app.
- Support CTA still points to `support@example.com`, which fails App Store review (`app/routes/app.settings.tsx`).
- README remains the stock Shopify template and does not describe the product, pricing, or support commitments (`README.md`).
- Production configuration references a temporary Cloudflare tunnel instead of a stable HTTPS domain (`shopify.app.toml`).
- Prisma is locked to SQLite; Shopify review expects redundant, backed-up storage (Postgres/MySQL) before listing (`prisma/schema.prisma`).

### Open questions
- Should Flow automation rely on the upcoming Flow Action connector (requires `authenticate.flow` support) or the generic Flow HTTP step documented today? Decision impacts auth + payload contract for `app/routes/api.flow.adjust-points.ts`.
- What is the planned source of truth for analytics (Admin API snapshots vs. webhook/event store)? Clarify before reworking KPIs in `app/routes/app._index.tsx`.

---

## Gemini.md Discrepancies
- Document states the Remix app lives in `web/` and references `packages/shared/`, but production code moved to `app/` and the shared package directory does not exist (`gemini.md`).
- Gemini promises working Checkout UI extension and referral analytics; repo only includes scaffolds or mock data (`extensions/points-redeem/`, `app/routes/app.analytics.tsx`).
- Billing/AppSubscription scaffolds are advertised yet missing in code, creating expectations the product does not meet (`gemini.md`).

---

## Shopify App Store Launch Blockers
- Implement GDPR handlers for `customers/data_request`, `customers/redact`, and `shop/redact` endpoints before submission (`app/routes/webhooks.gdpr.tsx`).
- Add billing and plan gating (AppSubscription/AppUsage) to align with stated monetisation strategy and App Store policies.
- Replace placeholder support email with a monitored address and surface support expectations in-product (`app/routes/app.settings.tsx`).
- Update README and marketing copy to describe functionality, pricing, support, and setup steps for reviewers and merchants (`README.md`).
- Migrate to a stable production domain + certificate and update `shopify.app.toml` with the final URL.
- Move from SQLite to a hosted database (e.g., Postgres) and document backup/DR strategy.

---

## Hosting & Delivery Recommendations
1. **Fly.io** – Deploy Remix on Fly with managed Postgres, map `SHOPIFY_APP_URL` to the Fly hostname, and use regions close to Shopify (iad/ord).
2. **Render** – Managed Node service plus managed Postgres; simple build hooks for Prisma migrations and background workers for webhook retry logic.
3. **Railway** – Useful for per-branch environments with hosted Postgres/Redis; ensure environment variables (`SHOPIFY_API_KEY`, secrets, `DATABASE_URL`) are templated across services.

Document selected provider, database migration plan, and required env vars before handoff.
