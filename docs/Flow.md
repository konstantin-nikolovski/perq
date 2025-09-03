# Shopify Flow Recipes for Perq Loyalty App

This document outlines the Shopify Flow recipes to set up point awarding and tier management for your Perq Loyalty App. These flows will update customer metafields, which your app then reads for gating and display.

**Important Note:** When updating metafields in Shopify Flow, ensure the "Value" field contains only a single-line integer (no newlines or extra characters).

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
3.  **Call HTTP webhook** (to notify your app of the change and trigger any internal logic/analytics)
    *   **Method:** `POST`
    *   **URL:** `YOUR_APP_BASE_URL/api/flow/adjust-points` (Replace `YOUR_APP_BASE_URL` with your app's actual base URL)
    *   **Request body:**
        ```json
        {
          "customerId": "{{ customer.id }}",
          "pointsAdjustment": 50
        }
        ```
    *   **Content type:** `application/json`

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
3.  **Call HTTP webhook**
    *   **Method:** `POST`
    *   **URL:** `YOUR_APP_BASE_URL/api/flow/adjust-points`
    *   **Request body:**
        ```json
        {
          "customerId": "{{ customer.id }}",
          "pointsAdjustment": {{ order.line_items_subtotal_quantity }}
        }
        ```
    *   **Content type:** `application/json`

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
3.  **Call HTTP webhook**
    *   **Method:** `POST`
    *   **URL:** `YOUR_APP_BASE_URL/api/flow/adjust-points`
    *   **Request body:**
        ```json
        {
          "customerId": "{{ customer.id }}",
          "pointsAdjustment": {{ order.total_price | floor }}
        }
        ```
    *   **Content type:** `application/json`

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