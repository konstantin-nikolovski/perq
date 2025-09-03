# Perq – Loyalty, Gating & Points (Project Context for AI)

## 1) Overview (what this app does)
Perq is a Shopify app that lets merchants:
- Award **points** for common actions (newsletter subscribe, amount spent, items bought).
- **Gate access** to collections/products/pages until a customer has enough points or a required tag.
- Let customers **redeem points** for discounts (ladder-based), optionally at checkout (Pro+).
- Show balances on the **account page**, manage **tiers**, run **mini analytics**, and send **email notifications**.
- Provide a **referral program** (Pro+).

**No paid third-party apps** are required. Starter uses **Shopify Flow + Shopify Email**; Pro+ adds **Checkout UI Extension + Discount Function** for dynamic redemption.

---

## 2) Must-have features
- Points earning rules (3 presets): newsletter, amount spent, items bought.
- Points → discount mapping (ladder).
- Display points on account page.
- **Gating** with minimal points or tag; per collection/product/page.
- Admin dashboard (settings, tiers, analytics).
- Tiered loyalty via thresholds + tags.
- Mini analytics: points awarded/used, top users, reasons.
- Email notifications (“You reached 500 points”).
- Referral program (links, attribution, rewards).
- Works on **Dawn**, **Beyond**, and any OS 2.0 theme.

### Non-goals (v1)
- No external paid email/sending providers (Shopify Email or store’s existing).
- No heavy DB requirements for Starter (can run DB-less).
- No theme-specific code beyond the Theme App Extension.

---

## 3) Tech stack & repo layout
- **TypeScript** everywhere. Lint: ESLint; Format: Prettier; Runtime validation: Zod.
- **Remix** embedded app in `web/` (App Bridge + Polaris).
- **Theme App Extension** in `extensions/early-access-gate/` (gating + page).
- **Checkout UI Extension** + **Discount Function** (feature-flagged for Pro+) in `extensions/`.
- Sessions via Prisma SQLite (dev) or Postgres later.
- Billing: AppSubscription + optional AppUsage (scaffold).

/ (repo root)
GEMINI.md
shopify.app.toml
package.json
pnpm-workspace.yaml
web/ # Remix app (admin, auth, webhooks)
extensions/
early-access-gate/ # Theme App Extension (gating + early-access page + asset)
points-redeem/ # Checkout UI Extension (Pro+, later)
points-discount/ # Discount Function (Pro+, later)
packages/shared/ # shared types, GraphQL ops, helpers
docs/ # setup & Flow recipes

---

## 4) Data model (metafields & tags)

**Customer (namespace `custom`)**
- `loyalty_points` → number_integer (current balance)
- `loyalty_points_lifetime` → number_integer (optional)
- `loyalty_tier` → single_line_text
- Tier tags: `tier-silver`, `tier-gold`, etc.

**Collection / Product / Page (namespace `custom`)**
- `loyalty_gated` → boolean
- `loyalty_gating_mode` → single_line_text (`points` | `tag` | `points_or_tag`)
- `loyalty_min_points` → number_integer
- `loyalty_required_tag` → single_line_text

---

## 5) Gating behavior (Theme App Extension)
- App-embed targets `<head>` to avoid flash; reads the above metafields.
- If gated and customer fails (insufficient points/no tag), hide DOM and **redirect** to `/pages/early-access` with query params:
  - `ctx`, `title`, `need`, `have`, `tag`, `mode`, `origin`
- Early-access page section + small JS fills bilingual text (EN/DE), **Back** (history/back fallback), **Login** link.

---

## 6) Points awarding (Flow-first)
**Shopify Flow recipes (docs/Flow.md):**
- Newsletter subscribe → `+50` points.
- Order paid → `+quantity` points.
- Order paid → `+floor(amount_spent)` points (optional rule; separate flow).
- Tier transitions: when crossing thresholds, add/remove tags + set `loyalty_tier`.
- Email: use **Shopify Email Automations** triggered by tags/segments (e.g., `tier-silver AND NOT silver-emailed`).

> Important: Flow “Update metafield (integer)” values must be **single-line integers** (no newlines).

---

## 7) Redemption (Pro+)
- **Checkout UI Extension** asks how many points to redeem.
- **Discount Function** reads customer points via input query & settings ladder; returns price adjustments. (Function is pure; points deduction is handled via webhook or post-purchase flow.)
- Ladder examples: `100 pts → $10`, `200 pts → $22` (configurable).

---

## 8) Referrals (Pro+)
- App proxy `GET /apps/r/:code` sets attribution cookie and redirects.
- On first paid order with attribution, award referrer + referee points (Flow or webhook).

---

## 9) Mini analytics
- Counters: points awarded, redeemed, outstanding; top users; referral usage.
- Starter can compute from metafields; Pro+ aggregates webhook events (optional DB).

---

## 10) i18n & copy
- EN/DE for early-access page JS; store locale from `<html lang>`.
- Polaris UI: use en default; later add i18n provider.

---

## 11) Coding conventions / guardrails for AI
- **Always output real file paths** from repo root.
- For multi-file responses, use **separate fenced code blocks**, one per file.
- Keep Liquid compatible with OS 2.0 (no non-existent filters).
- Don’t invent APIs; use Shopify Admin GraphQL & official extension APIs.
- TS: `"strict": true`, no `any`.
- Tests: include at least smoke tests/stubs for routes & functions.

---

## 12) “Done” checklists

**Theme App Extension**
- [ ] App embed renders in `<head>` and logs once.
- [ ] Redirect happens with `html{visibility:hidden}` (no flash).
- [ ] Early-access page loads asset and shows correct missing points text EN/DE.
- [ ] Back button goes `history.back()` with origin fallback.

**Flow recipes**
- [ ] Newsletter & Order flows write single-line integer values.
- [ ] Tiers add/remove tags correctly (crossing thresholds once).

**Admin**
- [ ] Polaris page shows mock totals and a table.
- [ ] Settings persist (shop metafields or DB).
- [ ] “Create metafield definitions” action succeeds idempotently.

---

## 13) Ready-to-run tasks (prompts)

**A) Generate Theme App Extension files**
> Create/overwrite these files with working code:
- `extensions/early-access-gate/snippets/early-access-gate.liquid`
- `extensions/early-access-gate/sections/early-access-message.liquid`
- `extensions/early-access-gate/templates/page.early-access.json`
- `extensions/early-access-gate/assets/early-access.js`

Include: gating logic (see §5), bilingual messages, login URL, no FOUC.

**B) Create Flow docs**
> Write `docs/Flow.md` with step-by-step for the 3 flows + tiers + email segments. Include exact single-line integer expressions.

**C) Admin dashboard route**
> Add `web/app/routes/app.points.tsx` with Polaris cards (totals) + table (top users; mock). Link from `web/app/routes/app._index.tsx`.

**D) Discount Function scaffold (Pro+)**
> Create `extensions/points-discount/` (function) and `extensions/points-redeem/` (checkout UI). Minimal working code + README.

---

## 14) Known pitfalls
- Flow integer updates fail if Liquid renders whitespace/newlines. Always render plain integers.
- Automatic discounts can’t target segments; use codes or Function for dynamic redemption.
- App embed must target **head** to prevent content flash.
