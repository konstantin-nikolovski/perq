# Perq Setup Guide (Theme + Settings)

- Early Access page:
  - Create a Shopify page with handle `early-access`.
  - In the theme editor, add the app block “Early Access Message” to that page.
- Account points display:
  - Add the app block “Loyalty Points Balance” to your account template/section.
- Flow action URL:
  - In `extensions/perq-adjust-points-action/shopify.extension.toml`, set `runtime_url` to your app URL + `/api/flow/adjust-points`.
  - Dev example: `https://<your-dev-tunnel>/api/flow/adjust-points`.
- Persisting settings:
  - Rules page saves `custom.loyalty_earn_rules` and `custom.loyalty_ladder` (JSON on the shop).
  - Tiers page saves `custom.loyalty_tiers` (JSON on the shop).
- Referral links:
  - Use `/apps/r/:code?to=/some/path` to set a 30-day `perq_ref` cookie and redirect to `to`.
- Pro+ scaffolds:
  - `extensions/points-redeem/` and `extensions/points-discount/` contain READMEs to generate extensions via CLI.

