# Perq Production Readiness Program

This playbook walks through every change required to ship Perq to the Shopify App Store with confidence. Follow the steps in sequence; each stage unblocks the next.

---

## 0. Baseline & Tooling
1. **Adopt pnpm everywhere**
   - Replace `npm` invocations in `Dockerfile` and `shopify.web.toml` with pnpm equivalents.
   - Commit a working `pnpm-lock.yaml` update after `pnpm install`.
   - Verify `pnpm lint` and `pnpm build` succeed locally.
2. **Environment hygiene**
   - Remove tunnel URLs from tracked config (`shopify.app.toml`, extension manifests) and move dev URLs to `.env`.
   - Add `env.example` documenting required variables (`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`, `DATABASE_URL`, `SCOPES`, etc.).
3. **Database migration**
   - Provision a managed Postgres instance (e.g., Fly.io, Render, Railway).
   - Update `prisma/schema.prisma` datasource to use Postgres connection string.
   - Run `pnpm prisma migrate deploy` against Postgres; ensure migrations succeed.

---

## 1. Core Product Completeness
4. **Finalize Flow adjust-points action**
   - Implement `authenticate.flow` (or manual HMAC verification) in `app/routes/api.flow.adjust-points.ts`.
   - Return `{ actions: [...], errors: [...] }` payload Shopify Flow expects.
   - Add input schema to `extensions/perq-adjust-points-action/shopify.extension.toml` so merchants can configure point deltas.
   - Test end-to-end via Flow dev store recipe.
5. **Checkout UI extension**
   - Replace scaffolding in `extensions/points-redeem/` with a real Checkout UI extension that writes the desired redemption amount to cart attributes.
   - Implement feature flag (metafield or plan gate) to hide UI for Starter shops.
6. **Discount function polish**
   - Double-check codegen artifacts are committed (`pnpm --filter points-discount exec graphql-codegen`).
   - Add unit tests for ladder parsing and amount distribution (binary execution via vitest or equivalent).
7. **Analytics corrections**
   - Refactor `app/routes/app._index.tsx` to fetch KPIs without double-counting (split revenue vs. quantity metrics, add null guards, surface API errors in UI).
   - Define data source (Admin API snapshot vs. stored aggregates) and adjust code accordingly.
8. **Theme gating UX fixes**
   - Update `extensions/early-access-gate/blocks/early-access-gate.liquid` default minimum points to `0` (or skip redirect when metafields unset).
   - Remove console debug logs in production, gate behind theme setting if needed.

---

## 2. Compliance & Billing
9. **GDPR webhooks**
   - Implement logic for `customers/data_request`, `customers/redact`, and `shop/redact` to export/delete customer and shop data from Postgres + metafields.
   - Document retention policy in README / submission notes.
10. **Billing integration**
    - Decide on pricing tiers and implement AppSubscription (and optional AppUsage) flows in Remix (`app/routes/app.subscribe.tsx` or similar).
    - Gate Pro+ features (Checkout extension, discount function) behind active subscription metafield.
    - Provide downgrade / cancellation handling + webhook for `app/uninstalled`.
11. **Support & SLAs**
    - Replace `support@example.com` with a monitored mailbox (e.g., `support@perq.app`).
    - Add in-app Support section detailing response times, plus link to knowledge base or help centre if available.

---

## 3. Quality & Stability
12. **Automated testing foundation**
    - Add `pnpm test` script (vitest or playwright). Include smoke tests for:
      - Flow adjust endpoint (HMAC verification, payload validation).
      - Discount function ladder parsing.
      - Gating logic (unit test Liquid helpers extracted to TS where possible).
    - Integrate lint + tests into CI (GitHub Actions or equivalent).
13. **Logging & observability**
    - Standardize logging (winston/pino) with structured output.
    - Integrate Sentry (or similar) for exception tracking in Remix and extensions.
14. **Security hardening**
    - Enforce CSP headers and frame-ancestors via Remix loader.
    - Rotate API secrets, store in secrets manager (Fly secrets, Render env, Railway variables).
    - Review scopes in `shopify.app.toml` and remove unused ones.

---

## 4. Documentation & Merchant Experience
15. **README & docs refresh**
    - Rewrite `README.md` to describe features, pricing, setup, support, and manual test plan.
    - Update `docs/SETUP.md` with new onboarding (metafields, Flow recipes, theme enablement).
    - Extend `docs/Flow.md` with screenshots or links after Flow action is live.
16. **Gemini.md alignment**
    - Update repo map in `gemini.md` to reflect actual directories and remove non-existent packages.
    - Mirror any new flows or configurations so agents stay in sync.
17. **Merchant onboarding assets**
    - Capture theme screenshots, Flow recipe exports, and discount activation steps for App Store listing.
    - Draft support macros/FAQs.

---

## 5. Hosting & Deployment
18. **Select hosting provider**
    - Choose Fly.io, Render, or Railway (see `AGENTS.md` recommendations).
    - Document reasoning and fallback.
19. **Provision infrastructure**
    - Deploy Remix server, configure Postgres, set up TLS + custom domain (`perq.app` or equivalent).
    - Configure background worker or queue for webhook retries if host requires separate process.
20. **CI/CD pipeline**
    - Set up automated deploys on main merges (GitHub Actions → provider deploy hook).
    - Include database migration step and health check verification.
21. **Observability hooks**
    - Enable provider alerts (CPU/memory) and set up log drains to chosen log service.

---

## 6. Launch Readiness
22. **Internal QA**
    - Run full test plan: install app on dev store, configure metafields, run Flow recipes, redeem points, refund orders, verify email notifications.
    - Record results and fix any defects.
23. **Support readiness**
    - Publish help centre / docs, ensure support inbox is monitored, create escalation path.
24. **Compliance checklist**
    - Prepare privacy policy + terms of service pages (required for Shopify listing).
    - Confirm GDPR, data retention, and incident response docs are accessible.
25. **App Store submission**
    - Produce app listing copy, pricing, media, and scope explanations.
    - Run Shopify App QA checklist ( https://shopify.dev/docs/apps/store/requirements ).
    - Submit for review and monitor feedback; address required changes promptly.

---

## 7. Post-Launch Operations
26. **Release management**
    - Adopt semantic versioning and changelog updates for every release.
    - Automate release notes distribution to merchants.
27. **Telemetry & feedback loop**
    - Monitor adoption metrics (installs, active shops, redemption volume).
    - Collect merchant feedback; feed into roadmap backlog.
28. **Incident response drills**
    - Simulate API key leak and webhook failure scenarios; document runbooks.

Completion of all steps above brings Perq to production-grade quality and compliance for the Shopify App Store.
