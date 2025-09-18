# Points Discount (Function) – Scaffold

This Discount Function applies a fixed-amount discount based on the customer's points and the configured ladder stored in `custom.loyalty_ladder`.

Suggested next steps:
- The function is pre-scaffolded with JS runtime:
  - `shopify.extension.toml`: uses `runtime = "javascript"`, `source = "src/index.ts"`, and `input_query = "src/input.graphql"`.
  - `src/input.graphql`: fetches customer points and the ladder metafield.
  - `src/index.ts`: parses the ladder, selects the best step for the customer's points, and applies an order-level discount.
- Handle points deduction post-purchase via webhook or Flow.

Validation assumptions:
- Ladder is an array of `{ points:number, amount:number }`, both positive.
- The best step is the highest `points` the customer meets.

Dev/prod note:
- Feature-flag this extension behind billing or a metafield toggle to keep Starter lean.
