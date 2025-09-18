import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import {
  adjustCustomerPoints,
  fetchOrderPointsState,
  updateOrderPointsState,
} from "../services/loyalty.server";
import {
  computeOrderSubtotalCents,
  extractCustomerGid,
  extractOrderGid,
  sumRefundLineSubtotalCents,
  parseMoneyToCents,
} from "../services/order-payload.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, payload } = await authenticate.webhook(request);

  if (!admin) {
    console.error("refunds/create webhook error: missing admin API context");
    return new Response("Admin client unavailable", { status: 500 });
  }

  try {
    const orderGid = extractOrderGid(payload) ?? extractOrderGid(payload?.order);
    if (!orderGid) {
      console.warn("refunds/create webhook skipped: missing order id");
      return new Response();
    }

    const state = await fetchOrderPointsState(admin, orderGid);
    const remaining = state.pointsRedeemed - state.pointsRefunded;
    if (remaining <= 0) {
      return new Response();
    }

    const orderSubtotalCents = state.subtotalCents
      || computeOrderSubtotalCents(payload?.order ?? payload)
      || parseMoneyToCents(
        payload?.order?.subtotal_price
          ?? payload?.order?.subtotal_price_set?.shop_money?.amount
          ?? payload?.order?.current_subtotal_price
          ?? payload?.order?.current_subtotal_price_set?.shop_money?.amount,
      )
      || 0;

    const discountValueCents = state.discountValueCents
      || parseMoneyToCents(
        payload?.order?.total_discounts
          ?? payload?.order?.total_discounts_set?.shop_money?.amount
          ?? payload?.order?.current_total_discounts
          ?? payload?.order?.current_total_discounts_set?.shop_money?.amount
          ?? payload?.total_discounts
          ?? payload?.current_total_discounts,
      )
      || 0;

    const netSubtotalCents = state.netSubtotalCents
      || Math.max(orderSubtotalCents - discountValueCents, 0);

    const refundNetCents = sumRefundLineSubtotalCents(payload);

    if (refundNetCents <= 0 && orderSubtotalCents <= 0) {
      console.warn("refunds/create webhook skipped: no refundable amount detected");
      return new Response();
    }

    let refundPoints = 0;
    const base = netSubtotalCents > 0 ? netSubtotalCents : orderSubtotalCents;
    if (base <= 0) {
      refundPoints = remaining;
    } else {
      const cappedRefund = Math.min(refundNetCents, base);
      const proportional = Math.round((state.pointsRedeemed * cappedRefund) / base);
      refundPoints = Math.min(remaining, Math.max(proportional, 0));
      if (refundNetCents >= base) {
        refundPoints = remaining;
      }
    }

    if (refundPoints <= 0) {
      return new Response();
    }

    const customerGid = state.customerId
      ?? extractCustomerGid(payload)
      ?? extractCustomerGid(payload?.order);

    if (!customerGid) {
      console.warn("refunds/create webhook skipped: missing customer id");
      return new Response();
    }

    await adjustCustomerPoints(admin, customerGid, refundPoints);

    const newRefunded = Math.min(state.pointsRedeemed, state.pointsRefunded + refundPoints);
    await updateOrderPointsState(admin, orderGid, {
      customerId: customerGid,
      pointsRedeemed: state.pointsRedeemed,
      pointsRefunded: newRefunded,
      subtotalCents: orderSubtotalCents || state.subtotalCents,
      netSubtotalCents,
      discountValueCents,
    });

    return new Response();
  } catch (error) {
    console.error("refunds/create webhook error", error);
    return new Response("Failed to process refunds/create webhook", { status: 500 });
  }
};
