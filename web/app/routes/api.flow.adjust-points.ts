import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";
import { authenticate } from "../shopify.server";

// Define the schema for the incoming Flow request
const FlowAdjustPointsSchema = z.object({
  customerId: z.string(),
  pointsAdjustment: z.number().int(),
});

export async function action({ request }: ActionFunctionArgs) {
  try {
    // Authenticate the request (e.g., HMAC validation for webhooks)
    // For Flow actions, Shopify typically sends a signed request.
    // The `authenticate` utility from shopify.server.ts should handle this.
    const { admin } = await authenticate.admin(request);

    if (!admin) {
      return json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { customerId, pointsAdjustment } = FlowAdjustPointsSchema.parse(body);

    // Fetch current customer points metafield
    const customerMetafieldResponse = await admin.graphql(
      `#graphql
      query GetCustomerLoyaltyPoints($customerId: ID!) {
        customer(id: $customerId) {
          id
          metafield(namespace: "custom", key: "loyalty_points") {
            id
            value
          }
        }
      }`,
      {
        variables: {
          customerId: `gid://shopify/Customer/${customerId}`,
        },
      }
    );

    const customerData = await customerMetafieldResponse.json();
    const customerNode = customerData.data?.customer;

    if (!customerNode) {
      return json({ message: "Customer not found" }, { status: 404 });
    }

    let currentPoints = 0;
    let metafieldId = null;

    if (customerNode.metafield) {
      currentPoints = parseInt(customerNode.metafield.value, 10);
      metafieldId = customerNode.metafield.id;
    }

    const newPoints = currentPoints + pointsAdjustment;

    // Update or create customer points metafield
    const metafieldInput = metafieldId
      ? { id: metafieldId, value: String(newPoints) } // value must be string for metafields
      : { ownerId: customerNode.id, namespace: "custom", key: "loyalty_points", value: String(newPoints), type: "number_integer" };

    const updateMetafieldResponse = await admin.graphql(
      `#graphql
      mutation UpdateCustomerLoyaltyPoints($customerId: ID!, $metafields: [CustomerMetafieldInput!]!) {
        customerUpdate(input: { id: $customerId, metafields: $metafields }) {
          customer {
            id
            metafield(namespace: "custom", key: "loyalty_points") {
              id
              value
            }
          }
          userErrors {
            field
            message
          }
        }
      }`,
      {
        variables: {
          customerId: customerNode.id,
          metafields: [metafieldInput],
        },
      }
    );

    const updateData = await updateMetafieldResponse.json();

    if (updateData.data?.customerUpdate?.userErrors?.length > 0) {
      console.error("Error updating metafield:", updateData.data.customerUpdate.userErrors);
      return json({ message: "Failed to update points", errors: updateData.data.customerUpdate.userErrors }, { status: 500 });
    }

    return json({ message: "Points adjusted successfully", newPoints });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ message: "Invalid request payload", errors: error.errors }, { status: 400 });
    }
    console.error("Error in adjust-points:", error);
    return json({ message: "Internal server error" }, { status: 500 });
  }
}
