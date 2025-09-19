# Shopify Flow Recipes for Perq Loyalty App

This document outlines the Shopify Flow recipes to set up point awarding and tier management for your Perq Loyalty App. These flows will update customer metafields, which your app then reads for gating and display.

**Important Note:** When updating metafields in Shopify Flow, ensure the "Value" field contains only a single-line integer (no newlines or extra characters).

---

## Configuring the Perq Flow action

When you add the **Perq – Adjust loyalty points** action inside Shopify Flow you can tailor how many points get awarded:

- **Customer** – required. Pick the customer whose balance should change.
- **Points mode** – leave blank to award a fixed amount, or set to `per_currency` / `per_quantity` (underscores optional) for dynamic logic.
- **Points adjustment** – required for the fixed mode. Enter the exact number of points to add (negative values subtract).
- **Points multiplier** – optional. Defaults to `1`. For dynamic modes this is the number of points per unit (e.g., `2` for two points per €1 or per item).
- **Currency amount path** – only for `per_currency`. Either insert a Flow variable (e.g., `{{ order.current_total_price_set.shop_money.amount }}`) or type the dot path to the monetary amount (e.g., `order.current_total_price_set.shop_money.amount`).
- **Quantity path** – only for `per_quantity`. Insert a Flow variable or path to the quantity value (e.g., `{{ order.line_items_subtotal_quantity }}` or `order.line_items_subtotal_quantity`).

> Tip: Use Flow's preview to inspect the payload and copy the field names. Amounts typically appear as strings—Perq converts them to numbers before applying the multiplier and rounding down to an integer.

---

## 1. Award Points for Newsletter Subscription

This flow awards a fixed number of points (e.g., 50) when a customer subscribes to your newsletter.

**Flow Trigger:** Customer subscribed to email marketing

**Actions:**

1.  **Get customer data** (if not already available from trigger)
2.  **Update customer metafield**
    *   **Metafield:** `customer.metafields.custom.loyalty_points` (Number Integer)
    *   **Value:** `{{ customer.metafields.custom.loyalty_points.value | default: 0 | plus: 50 }}`
        *   *Explanation:* This gets the current loyalty points (defaulting to 0 if none exist) and adds 50.
3.  **Perq Flow action:** add **Perq – Adjust loyalty points**.
    *   Leave **Points mode** blank (defaults to fixed).
    *   Enter the number of points in **Points adjustment** (e.g., `50`).

---

## 2. Award Points for Order Paid (by Quantity)

This flow awards points equal to the quantity of items purchased in an order.

**Flow Trigger:** Order paid

**Conditions:** (Optional, e.g., only for specific products or minimum order value)

**Actions:**

1.  **Get customer data** (if not already available from trigger)
2.  **Update customer metafield**
    *   **Metafield:** `customer.metafields.custom.loyalty_points` (Number Integer)
    *   **Value:** `{{ customer.metafields.custom.loyalty_points.value | default: 0 | plus: order.line_items_subtotal_quantity }}`
        *   *Explanation:* Adds the total quantity of line items in the order to the customer's current points.
3.  **Perq Flow action:** add **Perq – Adjust loyalty points**.
    *   Set **Points mode** to `per_quantity`.
    *   Set **Quantity path** to `order.line_items_subtotal_quantity` (or the field your trigger exposes).
    *   Optionally set **Points multiplier** to award more than one point per item.

---

## 3. Award Points for Order Paid (by Amount Spent)

This flow awards points equal to the floor of the amount spent on an order (e.g., $10.50 spent awards 10 points).

**Flow Trigger:** Order paid

**Conditions:** (Optional, e.g., only for specific products or minimum order value)

**Actions:**

1.  **Get customer data** (if not already available from trigger)
2.  **Update customer metafield**
    *   **Metafield:** `customer.metafields.custom.loyalty_points` (Number Integer)
    *   **Value:** `{{ customer.metafields.custom.loyalty_points.value | default: 0 | plus: order.total_price | floor }}`
        *   *Explanation:* Adds the floor of the order's total price to the customer's current points.
3.  **Perq Flow action:** add **Perq – Adjust loyalty points**.
    *   Set **Points mode** to `per_currency`.
    *   Set **Currency amount path** to the amount you care about (insert the Flow token, e.g., `{{ order.current_subtotal_price_set.shop_money.amount }}`, or type the path `order.current_subtotal_price_set.shop_money.amount`).
    *   Set **Points multiplier** to the number of points per currency unit (e.g., `1` = one point per €1, `0.5` = half a point per currency unit).

---

## 4. Tier Transitions (Example: Silver Tier)

This flow manages customer tiers by adding/removing tags and setting the `loyalty_tier` metafield when a customer crosses a points threshold. You would create similar flows for each tier (e.g., Gold, Platinum).

**Flow Trigger:** Customer metafield updated (specifically `customer.metafields.custom.loyalty_points`)

**Conditions:**

*   **Condition 1 (Points Threshold):** `customer.metafields.custom.loyalty_points.value` is greater than or equal to `X` (e.g., 500 for Silver)
*   **Condition 2 (Not already in tier):** `customer.tags` does not contain `tier-silver` (or the tag for the tier you are entering)

**Actions:**

1.  **Add customer tag:** `tier-silver`
2.  **Remove customer tag:** (Optional, if moving from a lower tier, e.g., `tier-bronze`)
3.  **Update customer metafield:**
    *   **Metafield:** `customer.metafields.custom.loyalty_tier` (Single Line Text)
    *   **Value:** `Silver`
4.  **Call HTTP webhook** (Optional, to notify your app of tier change for analytics/internal logic)
    *   **Method:** `POST`
    *   **URL:** `YOUR_APP_BASE_URL/api/flow/tier-change` (You would need to implement this endpoint)
    *   **Request body:**
        ```json
        {
          "customerId": "{{ customer.id }}",
          "newTier": "Silver"
        }
        ```
    *   **Content type:** `application/json`

---

## 5. Email Notifications (Example: Tier Reached)

Use Shopify Email Automations triggered by customer tags or segments.

**Example Automation:** "Customer reaches Silver Tier"

**Trigger:** Customer tag added (`tier-silver`)

**Audience Segment:** Customers tagged with `tier-silver` AND NOT `silver-emailed` (to prevent repeat emails)

**Actions:**

1.  **Send email** (Customize your email content to congratulate them on reaching the tier).
2.  **Add customer tag:** `silver-emailed` (to mark that they've received the email for this tier).

---
