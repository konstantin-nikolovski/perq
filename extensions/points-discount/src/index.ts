// Shopify Discount Function (Unified API, 2025-07) – Points ladder
// Expects shop metafield custom.loyalty_ladder as JSON array of { points:number, type:'amount'|'percentage', value:number }
// Reads customer points from custom.loyalty_points and applies the best matching step as an order discount.

import type {
  InputQuery,
  CartLinesDiscountsGenerateRunResult,
  ProductDiscountCandidate,
} from "../generated/api";
import { ProductDiscountSelectionStrategy } from "../generated/api";

type Step = { points: number; type: 'amount'|'percentage'; value: number };

function parseLadder(raw: string | null | undefined): Step[] {
  try {
    const parsed = JSON.parse(raw || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((s) => ({
        points: Number(s.points),
        type: (String(s.type || (typeof s.amount !== 'undefined' ? 'amount' : 'amount')).toLowerCase() === 'percentage') ? 'percentage' : 'amount',
        value: Number(typeof s.value !== 'undefined' ? s.value : s.amount),
      }))
      .filter((s) => Number.isFinite(s.points) && Number.isFinite(s.value) && s.points > 0 && s.value > 0)
      .sort((a, b) => a.points - b.points);
  } catch {
    return [];
  }
}

export function run(input: InputQuery): CartLinesDiscountsGenerateRunResult {
  const ladder = parseLadder(input.shop?.ladder?.value);

  if (ladder.length === 0) {
    return { operations: [] };
  }

  const ptsRaw = input.cart.buyerIdentity?.customer?.metafield?.value;
  const points = Math.max(0, parseInt(String(ptsRaw || "0"), 10) || 0);

  // Read chosen redemption points from cart attribute set by theme/UI
  const chosenAttr = input.cart?.attribute?.value;
  const requestedPoints = Math.max(0, parseInt(String(chosenAttr || "0"), 10) || 0);
  if (requestedPoints <= 0) {
    return { operations: [] };
  }
  const cappedRequest = Math.min(points, requestedPoints);

  // Pick the highest step the customer qualifies for that doesn't exceed the requested points
  let step: Step | null = null;
  if (cappedRequest > 0) {
    for (const s of ladder) {
      if (cappedRequest >= s.points) step = s; else break;
    }
  }
  if (!step) {
    return { operations: [] };
  }

  const lines = input.cart?.lines || [];
  if (!lines.length) {
    return { operations: [] };
  }

  if (step.type === 'percentage') {
    const lineTargets = lines.map((line) => ({ cartLine: { id: line.id } }));
    const candidate: ProductDiscountCandidate = {
      targets: lineTargets,
      value: { percentage: { value: step.value.toString() } },
      message: `Redeemed ${step.points} points (${step.value}%)`,
    };
    return {
      operations: [
        {
          productDiscountsAdd: {
            selectionStrategy: ProductDiscountSelectionStrategy.All,
            candidates: [candidate],
          },
        },
      ],
    };
  }

  const subtotalCents = lines.reduce((sum, line) => {
    const amount = Number(line.cost?.subtotalAmount?.amount || 0);
    if (!Number.isFinite(amount) || amount <= 0) return sum;
    return sum + Math.round(amount * 100);
  }, 0);

  if (subtotalCents <= 0) {
    return { operations: [] };
  }

  const targetAmountCents = Math.round(step.value * 100);
  if (targetAmountCents <= 0) {
    return { operations: [] };
  }

  let remainingCents = Math.min(targetAmountCents, subtotalCents);
  const candidates: ProductDiscountCandidate[] = [];

  lines.forEach((line, index) => {
    if (remainingCents <= 0) {
      return;
    }
    const rawAmount = Number(line.cost?.subtotalAmount?.amount || 0);
    if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
      return;
    }
    const lineSubtotalCents = Math.round(rawAmount * 100);
    if (lineSubtotalCents <= 0) {
      return;
    }

    let lineDiscountCents = Math.floor((targetAmountCents * lineSubtotalCents) / subtotalCents);
    lineDiscountCents = Math.min(lineDiscountCents, lineSubtotalCents);
    lineDiscountCents = Math.min(lineDiscountCents, remainingCents);

    if (index === lines.length - 1) {
      lineDiscountCents = Math.min(remainingCents, lineSubtotalCents);
    }

    if (lineDiscountCents <= 0) {
      return;
    }

    remainingCents -= lineDiscountCents;
    const amount = (lineDiscountCents / 100).toFixed(2);
    candidates.push({
      targets: [{ cartLine: { id: line.id } }],
      value: { fixedAmount: { amount, appliesToEachItem: false } },
      message: candidates.length === 0 ? `Redeemed ${step.points} points` : undefined,
    });
  });

  if (!candidates.length) {
    return { operations: [] };
  }

  return {
    operations: [
      {
        productDiscountsAdd: {
          selectionStrategy: ProductDiscountSelectionStrategy.All,
          candidates,
        },
      },
    ],
  };
}
