import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import { adjustCustomerPoints } from "~/services/loyalty.server";

function normalizeCustomerId(raw: unknown): string | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    if (raw.startsWith("gid://")) return raw;
    if (raw.trim() !== "") {
      return `gid://shopify/Customer/${raw.trim()}`;
    }
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return `gid://shopify/Customer/${raw}`;
  }
  return null;
}

function coerceInteger(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isInteger(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function coerceNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return undefined;
}

function findFieldValue(source: unknown, targetKey: string): unknown {
  if (!source || typeof source !== "object") return undefined;
  const nodes: unknown[] = [source];

  while (nodes.length) {
    const current = nodes.pop();

    if (!current || typeof current !== "object") {
      continue;
    }

    if (Array.isArray(current)) {
      for (const entry of current) {
        nodes.push(entry);
      }
      continue;
    }

    const obj = current as Record<string, unknown>;

    if (obj.key === targetKey && "value" in obj) {
      return obj.value;
    }

    if (obj[targetKey] !== undefined) {
      const candidate = obj[targetKey];
      if (candidate && typeof candidate === "object" && "value" in (candidate as Record<string, unknown>)) {
        return (candidate as Record<string, unknown>).value;
      }
      return candidate;
    }

    if (obj.fields) {
      nodes.push(obj.fields);
    }

    if (obj.inputs) {
      nodes.push(obj.inputs);
    }
  }

  return undefined;
}

function resolvePathValue(source: unknown, path: string): unknown {
  if (!path) return undefined;
  const normalized = path.replace(/\[(\w+)\]/g, ".$1");
  const segments = normalized.split(".").map((segment) => segment.trim()).filter(Boolean);

  let current: unknown = source;

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number.parseInt(segment, 10);
      if (!Number.isInteger(index) || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
      continue;
    }

    if (typeof current !== "object") {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  if (current && typeof current === "object") {
    const candidate = current as Record<string, unknown>;
    if (candidate.amount !== undefined) {
      const numeric = coerceNumber(candidate.amount);
      if (numeric !== undefined) return numeric;
    }
    if (candidate.value !== undefined) {
      const numeric = coerceNumber(candidate.value);
      if (numeric !== undefined) return numeric;
    }
  }

  return current;
}

function resolveNumericFromPath(payload: unknown, path?: string | null): number | undefined {
  if (!path) return undefined;
  const raw = resolvePathValue(payload, path);
  const numeric = coerceNumber(raw);
  if (numeric !== undefined) {
    return numeric;
  }
  if (raw && typeof raw === "object") {
    const valueCandidate = (raw as Record<string, unknown>).value;
    const amountCandidate = (raw as Record<string, unknown>).amount;
    return coerceNumber(valueCandidate ?? amountCandidate);
  }
  return undefined;
}

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { admin, payload } = await authenticate.flow(request);

    if (!admin) {
      return json({ actions: [], errors: [{ message: "Unauthorized" }] }, { status: 401 });
    }

    console.log("Flow adjust-points payload", payload);

    const rawCustomerId =
      findFieldValue(payload?.settings, "customer_id") ??
      findFieldValue(payload?.properties, "customer_id") ??
      findFieldValue(payload?.inputs, "customer_id") ??
      payload?.customer?.id ??
      findFieldValue(payload, "customer_id") ??
      findFieldValue(payload?.settings, "customerId") ??
      findFieldValue(payload?.properties, "customerId") ??
      findFieldValue(payload?.inputs, "customerId") ??
      findFieldValue(payload, "customerId");

    const modeRaw =
      findFieldValue(payload?.settings, "points_mode") ??
      findFieldValue(payload?.settings, "pointsMode") ??
      findFieldValue(payload?.properties, "points_mode") ??
      findFieldValue(payload?.properties, "pointsMode") ??
      findFieldValue(payload, "points_mode") ??
      findFieldValue(payload, "pointsMode");

    const multiplierRaw =
      findFieldValue(payload?.settings, "multiplier") ??
      findFieldValue(payload?.properties, "multiplier") ??
      findFieldValue(payload, "multiplier");

    const currencyPathRaw =
      findFieldValue(payload?.settings, "currency_path") ??
      findFieldValue(payload?.settings, "currencyPath") ??
      findFieldValue(payload?.properties, "currency_path") ??
      findFieldValue(payload?.properties, "currencyPath") ??
      findFieldValue(payload, "currency_path") ??
      findFieldValue(payload, "currencyPath");

    const quantityPathRaw =
      findFieldValue(payload?.settings, "quantity_path") ??
      findFieldValue(payload?.settings, "quantityPath") ??
      findFieldValue(payload?.properties, "quantity_path") ??
      findFieldValue(payload?.properties, "quantityPath") ??
      findFieldValue(payload, "quantity_path") ??
      findFieldValue(payload, "quantityPath");

    const rawAdjustment =
      findFieldValue(payload?.settings, "points_adjustment") ??
      findFieldValue(payload?.properties, "points_adjustment") ??
      findFieldValue(payload?.inputs, "points_adjustment") ??
      findFieldValue(payload, "points_adjustment") ??
      findFieldValue(payload?.settings, "pointsAdjustment") ??
      findFieldValue(payload?.properties, "pointsAdjustment") ??
      findFieldValue(payload?.inputs, "pointsAdjustment") ??
      findFieldValue(payload, "pointsAdjustment");

    const customerGid = normalizeCustomerId(rawCustomerId);

    const modeInput = typeof modeRaw === "string"
      ? modeRaw
      : Array.isArray(modeRaw)
        ? String(modeRaw[0])
        : "";

    const modeNormalized = modeInput.trim().toLowerCase().replace(/[^a-z]/g, "");

    const resolvedMultiplier = coerceNumber(multiplierRaw);
    const multiplier = resolvedMultiplier === undefined || resolvedMultiplier === 0 ? 1 : resolvedMultiplier;

    let pointsAdjustment: number | undefined;

    if (modeNormalized === "percurrency") {
      const currencyPathInput = typeof currencyPathRaw === "string"
        ? currencyPathRaw
        : Array.isArray(currencyPathRaw)
          ? String(currencyPathRaw[0])
          : undefined;

      const currencyPath = currencyPathInput?.trim() || undefined;

      let baseAmount = resolveNumericFromPath(payload, currencyPath);
      if (typeof baseAmount !== "number") {
        baseAmount = coerceNumber(currencyPathRaw) ?? (currencyPath ? coerceNumber(currencyPath) : undefined);
      }

      if (typeof baseAmount !== "number") {
        return json({
          actions: [],
          errors: [{ message: "Currency path did not resolve to a numeric value." }],
        }, { status: 400 });
      }
      pointsAdjustment = Math.trunc(Math.floor(baseAmount * multiplier));
    } else if (modeNormalized === "perquantity") {
      const quantityPathInput = typeof quantityPathRaw === "string"
        ? quantityPathRaw
        : Array.isArray(quantityPathRaw)
          ? String(quantityPathRaw[0])
          : undefined;

      const quantityPath = quantityPathInput?.trim() || undefined;

      let baseQuantity = resolveNumericFromPath(payload, quantityPath);
      if (typeof baseQuantity !== "number") {
        baseQuantity = coerceNumber(quantityPathRaw) ?? (quantityPath ? coerceNumber(quantityPath) : undefined);
      }

      if (typeof baseQuantity !== "number") {
        return json({
          actions: [],
          errors: [{ message: "Quantity path did not resolve to a numeric value." }],
        }, { status: 400 });
      }
      pointsAdjustment = Math.trunc(Math.round(baseQuantity * multiplier));
    } else {
      pointsAdjustment = coerceInteger(rawAdjustment);
    }

    if (!customerGid || typeof pointsAdjustment !== "number" || !Number.isFinite(pointsAdjustment)) {
      return json({
        actions: [],
        errors: [{ message: "Invalid request payload" }],
      }, { status: 400 });
    }

    const newPoints = await adjustCustomerPoints(admin, customerGid, pointsAdjustment);

    return json({
      actions: [],
      errors: [],
      data: {
        customerId: customerGid,
        pointsAdjustment,
        newPoints,
      },
    });
  } catch (error) {
    console.error("adjust-points error:", error);
    return json({
      actions: [],
      errors: [{ message: "Internal server error" }],
    }, { status: 500 });
  }
};
