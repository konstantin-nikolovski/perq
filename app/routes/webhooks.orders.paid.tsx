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
  extractRedeemedPoints,
  parseMoneyToCents,
} from "../services/order-payload.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, payload } = await authenticate.webhook(request);

  try {
    const redeemedPoints = extractRedeemedPoints(payload);
    if (!redeemedPoints || redeemedPoints <= 0) {
      return new Response();
    }

    const customerGid = extractCustomerGid(payload);
    if (!customerGid) {
      console.warn("orders/paid webhook skipped: missing customer id");
      return new Response();
    }

    const orderGid = extractOrderGid(payload);
    if (!orderGid) {
      console.warn("orders/paid webhook skipped: missing order id");
      return new Response();
    }

    const currentState = await fetchOrderPointsState(admin, orderGid);
    const discountValueCents = parseMoneyToCents(
      payload?.total_discounts
        ?? payload?.total_discounts_set?.shop_money?.amount
        ?? payload?.current_total_discounts
        ?? payload?.current_total_discounts_set?.shop_money?.amount,
    );

    const netSubtotalRaw = parseMoneyToCents(
      payload?.current_subtotal_price
        ?? payload?.current_subtotal_price_set?.shop_money?.amount
        ?? payload?.subtotal_price
        ?? payload?.subtotal_price_set?.shop_money?.amount,
    );

    let grossSubtotalCents = computeOrderSubtotalCents(payload);
    if (!grossSubtotalCents && netSubtotalRaw) {
      grossSubtotalCents = netSubtotalRaw + discountValueCents;
    }
    if (!grossSubtotalCents) {
      grossSubtotalCents = currentState.subtotalCents;
    }
    if (grossSubtotalCents && netSubtotalRaw && grossSubtotalCents < netSubtotalRaw) {
      grossSubtotalCents = netSubtotalRaw + discountValueCents;
    }

    const netSubtotalCents = netSubtotalRaw || Math.max(grossSubtotalCents - discountValueCents, 0);

    const delta = redeemedPoints - currentState.pointsRedeemed;
    if (delta <= 0) {
      if ((!currentState.subtotalCents && grossSubtotalCents > 0)
        || (!currentState.netSubtotalCents && netSubtotalCents > 0)) {
        await updateOrderPointsState(admin, orderGid, {
          customerId: currentState.customerId ?? customerGid,
          pointsRedeemed: currentState.pointsRedeemed,
          pointsRefunded: currentState.pointsRefunded,
          subtotalCents: grossSubtotalCents,
          netSubtotalCents,
          discountValueCents,
        });
      }
      return new Response();
    }

    await adjustCustomerPoints(admin, customerGid, -delta);

    await updateOrderPointsState(admin, orderGid, {
      customerId: customerGid,
      pointsRedeemed: redeemedPoints,
      pointsRefunded: currentState.pointsRefunded,
      subtotalCents: grossSubtotalCents,
      netSubtotalCents,
      discountValueCents,
    });

    return new Response();
  } catch (error) {
    console.error("orders/paid webhook error", error);
    return new Response("Failed to process orders/paid webhook", { status: 500 });
  }
};
