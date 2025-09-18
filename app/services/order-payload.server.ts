export const POINTS_ATTRIBUTE_KEY = "perq_points_redeem";

function parseAmountToCents(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.round(parsed * 100);
    }
  }
  return 0;
}

export function parseMoneyToCents(value: unknown): number {
  return parseAmountToCents(value);
}

export function computeOrderSubtotalCents(payload: any): number {
  const direct = parseAmountToCents(payload?.current_subtotal_price ?? payload?.subtotal_price);
  if (direct > 0) {
    return direct;
  }

  if (Array.isArray(payload?.line_items)) {
    let sum = 0;
    for (const line of payload.line_items) {
      const subtotal = parseAmountToCents(line?.subtotal ?? line?.line_price ?? line?.discounted_price);
      if (subtotal > 0) {
        sum += subtotal;
        continue;
      }
      const price = parseAmountToCents(line?.price);
      const quantity = typeof line?.quantity === "number"
        ? line.quantity
        : parseInt(String(line?.quantity ?? "0"), 10);
      if (price > 0 && Number.isFinite(quantity) && quantity > 0) {
        sum += price * quantity;
      }
    }
    if (sum > 0) {
      return sum;
    }
  }

  return 0;
}

export function extractCustomerGid(payload: any): string | null {
  const adminId = payload?.customer?.admin_graphql_api_id ?? payload?.customer?.customer_admin_graphql_api_id;
  if (typeof adminId === "string" && adminId.startsWith("gid://")) {
    return adminId;
  }
  const numericId = payload?.customer?.id ?? payload?.customer_id;
  if (numericId) {
    return `gid://shopify/Customer/${numericId}`;
  }
  return null;
}

export function extractOrderGid(payload: any): string | null {
  const adminId = payload?.admin_graphql_api_id ?? payload?.order?.admin_graphql_api_id;
  if (typeof adminId === "string" && adminId.startsWith("gid://") && adminId.includes("/Order/")) {
    return adminId;
  }
  const numericId = payload?.order_id ?? payload?.order?.id;
  if (numericId) {
    return `gid://shopify/Order/${numericId}`;
  }
  return null;
}

export function extractRedeemedPoints(payload: any): number {
  const attributes = Array.isArray(payload?.note_attributes)
    ? payload.note_attributes
    : [];
  const match = attributes.find((attr: any) => {
    const key = attr?.name ?? attr?.key;
    return typeof key === "string" && key === POINTS_ATTRIBUTE_KEY;
  });
  if (!match) return 0;
  return parseInt(String(match.value ?? "0"), 10) || 0;
}

export function extractAttribute(payload: any, key: string): string | null {
  const attributes = Array.isArray(payload?.note_attributes)
    ? payload.note_attributes
    : [];
  const match = attributes.find((attr: any) => {
    const name = attr?.name ?? attr?.key;
    return typeof name === "string" && name === key;
  });
  return match?.value != null ? String(match.value) : null;
}

export function sumRefundSubtotalCents(refundPayload: any): number {
  const lineItems = Array.isArray(refundPayload?.refund_line_items) ? refundPayload.refund_line_items : [];
  const adjustments = Array.isArray(refundPayload?.order_adjustments) ? refundPayload.order_adjustments : [];

  let positiveCents = 0;
  let negativeCents = 0;

  for (const line of lineItems) {
    const cents = parseAmountToCents(
      line?.subtotal
        ?? line?.total
        ?? line?.subtotal_set?.shop_money?.amount
        ?? line?.total_set?.shop_money?.amount,
    );
    if (cents > 0) positiveCents += cents;
    if (cents < 0) negativeCents += cents;
  }

  for (const adj of adjustments) {
    const cents = parseAmountToCents(adj?.amount ?? adj?.amount_set?.shop_money?.amount);
    if (cents > 0) positiveCents += cents;
    if (cents < 0) negativeCents += cents;
  }

  const net = positiveCents + negativeCents;
  return net > 0 ? net : positiveCents;
}

export function sumRefundLineSubtotalCents(refundPayload: any): number {
  const lineItems = Array.isArray(refundPayload?.refund_line_items) ? refundPayload.refund_line_items : [];
  let total = 0;
  for (const line of lineItems) {
    const cents = parseAmountToCents(
      line?.subtotal
        ?? line?.total
        ?? line?.subtotal_set?.shop_money?.amount
        ?? line?.total_set?.shop_money?.amount,
    );
    total += cents;
  }
  return total;
}
