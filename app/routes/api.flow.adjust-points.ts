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

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      return json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const customerGid = normalizeCustomerId(body?.customerId);
    const pointsAdjustment = Number.isInteger(body?.pointsAdjustment) ? body.pointsAdjustment : undefined;
    if (!customerGid || typeof pointsAdjustment !== 'number') {
      return json({ message: "Invalid request payload" }, { status: 400 });
    }

    const newPoints = await adjustCustomerPoints(admin, customerGid, pointsAdjustment);

    return json({ message: "Points adjusted", newPoints });
  } catch (error) {
    console.error("adjust-points error:", error);
    return json({ message: "Internal server error" }, { status: 500 });
  }
};
