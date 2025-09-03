
import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

const CREATE_METAFIELD_DEFINITION_MUTATION = `#graphql
  mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
        name
      }
      userErrors {
        field
        message
        code
      }
    }
  }`;

// As defined in GEMINI.md
const DEFINITIONS = {
  customer: [
    {
      name: "Loyalty Points",
      namespace: "custom",
      key: "loyalty_points",
      type: "number_integer",
      description: "Current loyalty points balance.",
      ownerType: "CUSTOMER",
    },
    {
      name: "Loyalty Points (Lifetime)",
      namespace: "custom",
      key: "loyalty_points_lifetime",
      type: "number_integer",
      description: "Total loyalty points ever earned.",
      ownerType: "CUSTOMER",
    },
    {
      name: "Loyalty Tier",
      namespace: "custom",
      key: "loyalty_tier",
      type: "single_line_text_field",
      description: "Customer's current loyalty tier.",
      ownerType: "CUSTOMER",
    },
  ],
  resource: [
    {
      name: "Gated",
      namespace: "custom",
      key: "loyalty_gated",
      type: "boolean",
      description: "If this resource is gated by loyalty.",
    },
    {
      name: "Gating Mode",
      namespace: "custom",
      key: "loyalty_gating_mode",
      type: "single_line_text_field",
      description: "Gating mode: points, tag, or points_or_tag.",
      validations: [
        {
          name: "choices",
          value: '["points", "tag", "points_or_tag"]',
        },
      ],
    },
    {
      name: "Minimum Points",
      namespace: "custom",
      key: "loyalty_min_points",
      type: "number_integer",
      description: "Minimum points required for access.",
    },
    {
      name: "Required Tag",
      namespace: "custom",
      key: "loyalty_required_tag",
      type: "single_line_text_field",
      description: "Tag required for access.",
    },
  ],
  ownerTypes: ["PRODUCT", "COLLECTION", "PAGE"],
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const results = [];

  // Create customer definitions
  for (const definition of DEFINITIONS.customer) {
    const response = await admin.graphql(CREATE_METAFIELD_DEFINITION_MUTATION, {
      variables: { definition },
    });
    results.push(await response.json());
  }

  // Create resource definitions for each owner type
  for (const ownerType of DEFINITIONS.ownerTypes) {
    for (const def of DEFINITIONS.resource) {
      const definition = { ...def, ownerType };
      const response = await admin.graphql(
        CREATE_METAFIELD_DEFINITION_MUTATION,
        {
          variables: { definition },
        },
      );
      results.push(await response.json());
    }
  }

  // Filter for errors, but we consider 'TAKEN' as a success (idempotent)
  const errors = results
    .flatMap((res) => res.data?.metafieldDefinitionCreate?.userErrors || [])
    .filter((err) => err.code !== "TAKEN");

  if (errors.length > 0) {
    console.error("Metafield creation errors:", errors);
    return json({ success: false, errors }, { status: 500 });
  }

  return json({ success: true, results });
};
