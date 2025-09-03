
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineGrid,
  Text,
  Button,
  DataTable,
  Link,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

const CUSTOMERS_QUERY = `#graphql
  query Customers($first:Int!, $after:String, $query:String!) {
    customers(first:$first, after:$after, query:$query) {
      edges {
        cursor
        node {
          email
          lastOrder { processedAt }
          metafield(namespace:"custom", key:"loyalty_points") {
            value
            type
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }`;

const ORDERS_QUERY = `#graphql
  query Orders($first:Int!, $after:String, $query:String!) {
    orders(first:$first, after:$after, query:$query, sortKey:CREATED_AT, reverse:true) {
      edges {
        cursor
        node {
          totalPriceSet { shopMoney { amount } }
          lineItems(first:250) {
            edges {
              node {
                quantity
              }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  }`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // 1. Fetch all customers with points
  let allCustomers: { email: string; points: number; lastOrder: string }[] = [];
  let outstanding = 0;
  let activeMembers = 0;
  let hasNextCustomerPage = true;
  let customerCursor = null;

  while (hasNextCustomerPage) {
    const response = await admin.graphql(CUSTOMERS_QUERY, {
      variables: {
        first: 250,
        after: customerCursor,
        query: "metafield:custom.loyalty_points:*",
      },
    });
    const data = await response.json();
    const customers = data.data.customers.edges;

    for (const { node } of customers) {
      const points = parseInt(node.metafield?.value || "0", 10);
      if (points > 0) {
        allCustomers.push({
          email: node.email,
          points,
          lastOrder: node.lastOrder?.processedAt
            ? new Date(node.lastOrder.processedAt).toISOString().split("T")[0]
            : "—",
        });
        outstanding += points;
        activeMembers++;
      }
    }

    hasNextCustomerPage = data.data.customers.pageInfo.hasNextPage;
    customerCursor = data.data.customers.pageInfo.endCursor;
  }

  // 2. Sort for top users
  const topUsers = allCustomers
    .sort((a, b) => b.points - a.points)
    .slice(0, 5);

  // 3. Fetch recent orders for awarded points estimate
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateQuery = `created_at:>=${
    thirtyDaysAgo.toISOString().split("T")[0]
  } financial_status:paid`;

  let awarded30d = 0;
  let hasNextOrderPage = true;
  let orderCursor = null;

  while (hasNextOrderPage) {
    const response = await admin.graphql(ORDERS_QUERY, {
      variables: {
        first: 250,
        after: orderCursor,
        query: dateQuery,
      },
    });
    const data = await response.json();
    const orders = data.data.orders.edges;

    for (const { node } of orders) {
      awarded30d += Math.floor(parseFloat(node.totalPriceSet.shopMoney.amount));
      for (const lineItem of node.lineItems.edges) {
        awarded30d += lineItem.node.quantity;
      }
    }

    hasNextOrderPage = data.data.orders.pageInfo.hasNextPage;
    orderCursor = data.data.orders.pageInfo.endCursor;
  }

  return json({
    kpis: {
      awarded30d,
      redeemed30d: 0, // TODO
      outstanding,
      activeMembers,
    },
    topUsers,
  });
};

export default function Dashboard() {
  const { kpis, topUsers } = useLoaderData<typeof loader>();

  const topCustomersRows = topUsers.map((user) => [
    user.email,
    user.points.toLocaleString(),
    user.lastOrder,
  ]);

  return (
    <Page
      title="Loyalty dashboard"
      subtitle="At-a-glance health and setup"
      primaryAction={{ content: "View tiers", url: "/app/tiers" }}
    >
      <BlockStack gap="500">
        <Layout>
          {/* Setup Checklist - Unchanged */}
          <Layout.Section>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">
                  Setup checklist
                </Text>
                <BlockStack gap="300">
                  <InlineGrid columns={["oneThird", "auto"]} gap="200">
                    <Text as="p" variant="bodyMd">
                      1. Create metafield definitions for points and tiers.
                    </Text>
                    <Button url="/app/settings" variant="plain">
                      Open settings
                    </Button>
                  </InlineGrid>
                  <InlineGrid columns={["oneThird", "auto"]} gap="200">
                    <Text as="p" variant="bodyMd">
                      2. Enable the Early Access app embed in your theme.
                    </Text>
                    <Button
                      url="/admin/themes"
                      target="_blank"
                      variant="plain"
                    >
                      Open theme editor
                    </Button>
                  </InlineGrid>
                  <InlineGrid columns={["oneThird", "auto"]} gap="200">
                    <Text as="p" variant="bodyMd">
                      3. Create the /pages/early-access page.
                    </Text>
                    <Button
                      url="/admin/pages"
                      target="_blank"
                      variant="plain"
                    >
                      Open pages
                    </Button>
                  </InlineGrid>
                  <InlineGrid columns={["oneThird", "auto"]} gap="200">
                    <Text as="p" variant="bodyMd">
                      4. Install Shopify Flow recipes for earning points.
                    </Text>
                    <Button
                      url="https://shopify.com/admin/apps/flow"
                      target="_blank"
                      variant="plain"
                    >
                      Open Flow
                    </Button>
                  </InlineGrid>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* KPIs - Now with real data */}
          <Layout.Section>
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  KPIs (Last 30 days)
                </Text>
                <InlineGrid columns={4} gap="400">
                  <BlockStack gap="100" align="center">
                    <Text as="h3" variant="headingLg">
                      {kpis.awarded30d.toLocaleString()}
                    </Text>
                    <Text as="p" variant="bodyMd">
                      Points awarded
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100" align="center">
                    <Text as="h3" variant="headingLg">
                      {kpis.redeemed30d.toLocaleString()}
                    </Text>
                    <Text as="p" variant="bodyMd">
                      Points redeemed
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100" align="center">
                    <Text as="h3" variant="headingLg">
                      {kpis.outstanding.toLocaleString()}
                    </Text>
                    <Text as="p" variant="bodyMd">
                      Outstanding points
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100" align="center">
                    <Text as="h3" variant="headingLg">
                      {kpis.activeMembers.toLocaleString()}
                    </Text>
                    <Text as="p" variant="bodyMd">
                      Active members
                    </Text>
                  </BlockStack>
                </InlineGrid>
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Top Customers - Now with real data */}
          <Layout.Section>
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Top customers
                </Text>
                <DataTable
                  columnContentTypes={["text", "numeric", "text"]}
                  headings={["Email", "Points", "Last Order"]}
                  rows={topCustomersRows}
                />
              </BlockStack>
            </Card>
          </Layout.Section>

          {/* Quick Actions - Unchanged */}
          <Layout.Section>
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingMd">
                  Quick actions
                </Text>
                <InlineGrid columns={3} gap="400">
                  <Button url="/app/rules">Manage Rules</Button>
                  <Button url="/app/tiers">Manage Tiers</Button>
                  <Button url="/app/points">View Points Dashboard</Button>
                  <Button url="/admin/themes" target="_blank">
                    Customize Theme
                  </Button>
                </InlineGrid>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
