import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { readFile } from "fs/promises";
import path from "path";
import { authenticate } from "~/shopify.server";

// Some Admin API versions don't support appFunctionByHandle.
// We'll try it first, then fall back to listing appFunctions and picking a DISCOUNT function.
const DISCOUNT_TYPES = `#graphql
  query DiscountTypes {
    appDiscountTypes {
      functionId
      discountClass
      appKey
    }
  }
`;

const CREATE_AUTOMATIC = `#graphql
  mutation CreateAutomatic($discount: DiscountAutomaticAppInput!) {
    discountAutomaticAppCreate(automaticAppDiscount: $discount) {
      automaticAppDiscount { title status }
      userErrors { field message }
    }
  }
`;

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  if (!admin) return json({ ok: false, message: "Unauthorized" }, { status: 401 });

  // 1) Resolve function id (UUID expected by discountAutomaticAppCreate)
  const url = new URL(request.url);
  const functionIdOverride = url.searchParams.get('functionId') || url.searchParams.get('function_id') || undefined;
  let functionId: string | undefined = functionIdOverride;
  let discountTypesDebug: any = undefined;
  let chosenClass: string | undefined;
  try {
    const res = await admin.graphql(DISCOUNT_TYPES);
    const js = await res.json();
    const nodes: Array<{ functionId: string; discountClass?: string; appKey?: string }>
      = js?.data?.appDiscountTypes || [];
    discountTypesDebug = nodes;
    const appKey = process.env.SHOPIFY_API_KEY || undefined;
    const owned = appKey ? nodes.filter(n => (n.appKey || '').trim() === appKey.trim()) : nodes;
    if (functionIdOverride) {
      const match = owned.find(n => n.functionId === functionIdOverride) || nodes.find(n => n.functionId === functionIdOverride);
      chosenClass = match?.discountClass;
      if (!functionId) functionId = match?.functionId;
    }
    if (!functionId) {
      const pick = owned[0] || nodes[0];
      functionId = pick?.functionId;
      chosenClass = pick?.discountClass;
    }
  } catch {}
  // If we still don't have a functionId, return a helpful error with any debug info gathered.
  if (!functionId) {
    return json({ ok: false, message: "No discount function found. Deploy the function and use appDiscountTypes to get its UUID.", debug: { discountTypes: discountTypesDebug } }, { status: 400 });
  }

  // 2) Create automatic app discount bound to the function
  const now = new Date().toISOString();
  const desiredTitle = url.searchParams.get('title') || 'Perq – Points discount';
  const input: any = {
    functionId,
    title: desiredTitle,
    startsAt: now,
    combinesWith: { orderDiscounts: true, productDiscounts: true, shippingDiscounts: true },
  };
  // New unified Discounts API requires discountClasses to be set
  if (chosenClass) {
    input.discountClasses = [String(chosenClass).toUpperCase()];
  } else {
    // Fallback to PRODUCT if unknown (your store reported PRODUCT earlier)
    input.discountClasses = ["PRODUCT"];
  }

  // Create using the UUID functionId
  try {
    const createRes = await admin.graphql(CREATE_AUTOMATIC, { variables: { discount: { ...input, functionId } } });
    const createJson = await createRes.json();
    const errs = createJson?.data?.discountAutomaticAppCreate?.userErrors || [];
    if (errs.length) {
      const uniqueTitle = errs.find((e: any) => Array.isArray(e?.field) && e.field.includes('title') && /unique/i.test(String(e?.message || '')));
      if (uniqueTitle) {
        // Treat as idempotent success: discount with this title already exists
        return json({ ok: true, alreadyExists: true, title: desiredTitle, functionId });
      }
      return json({ ok: false, message: "Failed to create automatic discount", errors: errs, attemptedFunctionId: functionId }, { status: 400 });
    }
    return json({ ok: true, discount: createJson?.data?.discountAutomaticAppCreate?.automaticAppDiscount, functionId });
  } catch (e: any) {
    return json({ ok: false, message: e?.message || 'GraphQL error creating discount', attemptedFunctionId: functionId }, { status: 400 });
  }
};
