type AdminGraphqlClient = {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
};

const CUSTOMER_POINTS_QUERY = `#graphql
  query GetCustomerPoints($customerId: ID!) {
    customer(id: $customerId) {
      id
      metafield(namespace: "custom", key: "loyalty_points") {
        id
        value
      }
    }
  }
`;

const ORDER_POINTS_STATE_QUERY = `#graphql
  query GetOrderPointsState($orderId: ID!) {
    order(id: $orderId) {
      id
      customer { id }
      pointsRedeemed: metafield(namespace: "custom", key: "loyalty_points_redeemed") { value }
      pointsRefunded: metafield(namespace: "custom", key: "loyalty_points_refunded") { value }
      subtotalCents: metafield(namespace: "custom", key: "loyalty_points_redeemed_subtotal_cents") { value }
      netSubtotalCents: metafield(namespace: "custom", key: "loyalty_points_net_subtotal_cents") { value }
      discountValueCents: metafield(namespace: "custom", key: "loyalty_points_discount_value_cents") { value }
    }
  }
`;

const METAFIELDS_SET_MUTATION = `#graphql
  mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id key namespace }
      userErrors { field message }
    }
  }
`;

function parseIntField(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === "string") {
    const parsed = parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export async function adjustCustomerPoints(
  admin: AdminGraphqlClient,
  customerGid: string,
  delta: number,
): Promise<number> {
  const customerRes = await admin.graphql(CUSTOMER_POINTS_QUERY, {
    variables: { customerId: customerGid },
  });
  const customerJson = await customerRes.json();
  const customerNode = customerJson?.data?.customer;
  if (!customerNode) {
    throw new Error("Customer not found when adjusting points");
  }

  const currentPoints = parseIntField(customerNode.metafield?.value);
  const newPoints = currentPoints + delta;

  const updateRes = await admin.graphql(METAFIELDS_SET_MUTATION, {
    variables: {
      metafields: [
        {
          ownerId: customerNode.id,
          namespace: "custom",
          key: "loyalty_points",
          type: "number_integer",
          value: String(newPoints),
        },
      ],
    },
  });
  const updateJson = await updateRes.json();
  const userErrors = updateJson?.data?.metafieldsSet?.userErrors ?? [];
  if (userErrors.length) {
    const message = userErrors.map((e: any) => e?.message).filter(Boolean).join(", ") || "Failed to update customer points";
    throw new Error(message);
  }

  return newPoints;
}

export type OrderPointsState = {
  customerId: string | null;
  pointsRedeemed: number;
  pointsRefunded: number;
  subtotalCents: number;
  netSubtotalCents: number;
  discountValueCents: number;
};

export async function fetchOrderPointsState(
  admin: AdminGraphqlClient,
  orderGidOrId: string,
): Promise<OrderPointsState> {
  const literalGid = orderGidOrId.startsWith("gid://")
    ? orderGidOrId
    : `gid://shopify/Order/${orderGidOrId}`;

  const res = await admin.graphql(ORDER_POINTS_STATE_QUERY, {
    variables: { orderId: literalGid },
  });
  const json = await res.json();
  const order = json?.data?.order;
  if (!order) {
    return {
      customerId: null,
      pointsRedeemed: 0,
      pointsRefunded: 0,
      subtotalCents: 0,
      netSubtotalCents: 0,
      discountValueCents: 0,
    };
  }

  return {
    customerId: order.customer?.id ?? null,
    pointsRedeemed: parseIntField(order.pointsRedeemed?.value),
    pointsRefunded: parseIntField(order.pointsRefunded?.value),
    subtotalCents: parseIntField(order.subtotalCents?.value),
    netSubtotalCents: parseIntField(order.netSubtotalCents?.value),
    discountValueCents: parseIntField(order.discountValueCents?.value),
  };
}

export async function updateOrderPointsState(
  admin: AdminGraphqlClient,
  orderGid: string,
  state: OrderPointsState,
): Promise<void> {
  const metafields = [
    {
      ownerId: orderGid,
      namespace: "custom",
      key: "loyalty_points_redeemed",
      type: "number_integer",
      value: String(state.pointsRedeemed),
    },
    {
      ownerId: orderGid,
      namespace: "custom",
      key: "loyalty_points_refunded",
      type: "number_integer",
      value: String(state.pointsRefunded),
    },
    {
      ownerId: orderGid,
      namespace: "custom",
      key: "loyalty_points_redeemed_subtotal_cents",
      type: "number_integer",
      value: String(state.subtotalCents),
    },
    {
      ownerId: orderGid,
      namespace: "custom",
      key: "loyalty_points_net_subtotal_cents",
      type: "number_integer",
      value: String(state.netSubtotalCents),
    },
    {
      ownerId: orderGid,
      namespace: "custom",
      key: "loyalty_points_discount_value_cents",
      type: "number_integer",
      value: String(state.discountValueCents),
    },
  ];

  const res = await admin.graphql(METAFIELDS_SET_MUTATION, {
    variables: { metafields },
  });
  const json = await res.json();
  const userErrors = json?.data?.metafieldsSet?.userErrors ?? [];
  if (userErrors.length) {
    const message = userErrors.map((e: any) => e?.message).filter(Boolean).join(", ") || "Failed to update order metafields";
    throw new Error(message);
  }
}
