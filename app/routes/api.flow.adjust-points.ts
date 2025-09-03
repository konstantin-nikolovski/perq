import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import crypto from "crypto";
import { authenticate } from "~/shopify.server";

// The GraphQL mutation to update a customer's metafield
const UPDATE_CUSTOMER_POINTS_MUTATION = `#graphql
  mutation UpdateCustomerMetafield($customerId: ID!, $metafield: MetafieldInput!) {
    customerUpdate(input: {id: $customerId, metafields: [$metafield]}) {
      customer {
        id
        metafield(namespace: "custom", key: "loyalty_points") {
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }`;

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // 1. Verify the request is from Shopify
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  const body = await request.text();
  const secret = process.env.SHOPIFY_API_SECRET;

  if (!secret) {
    console.error("Shopify API secret is not set.");
    return json({ error: "Internal server error" }, { status: 500 });
  }

  const hash = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("base64");

  if (hash !== hmac) {
    return json({ error: "HMAC validation failed" }, { status: 401 });
  }

  // 2. Parse the incoming data from Flow
  const flowData = JSON.parse(body);
  const customerId = flowData.customerId;
  const pointsAdjustment = parseInt(flowData.pointsAdjustment, 10);

  if (!customerId || isNaN(pointsAdjustment)) {
    return json({ error: "Invalid input data" }, { status: 400 });
  }

  // 3. TODO: Implement the logic to fetch the customer's current points,
  // calculate the new total, and then update the metafield.
  // For now, we will just log the intended action.
  console.log(
    `TODO: Adjust points for customer ${customerId} by ${pointsAdjustment}`,
  );

  // Example of how you would call the mutation (to be completed):
  /*
  const response = await admin.graphql(UPDATE_CUSTOMER_POINTS_MUTATION, {
    variables: {
      customerId: `gid://shopify/Customer/${customerId}`,
      metafield: {
        namespace: "custom",
        key: "loyalty_points",
        type: "number_integer",
        value: "... new calculated value ..."
      }
    }
  });
  const result = await response.json();
  */

  // 4. Respond to Shopify
  return json({ success: true });
};