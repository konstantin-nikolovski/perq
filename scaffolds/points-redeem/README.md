# Points Redeem (Checkout UI Extension) – Scaffold

This is a placeholder for the Pro+ checkout UI extension that lets customers choose how many points to redeem at checkout. It’s intentionally lightweight to avoid adding build dependencies in dev.

Suggested next steps:
- Generate a Checkout UI Extension via Shopify CLI in this folder:
  - `shopify app generate extension --type=checkout_ui --name points-redeem`
- Use a simple input to select redeemable points and write the value to cart attributes or extension storage.
- Gate availability behind a feature flag or billing status.

Configuration notes:
- Read ladder settings from the shop metafield `custom.loyalty_ladder`.
- The Discount Function will compute the adjustment; the UI should only collect intent.

