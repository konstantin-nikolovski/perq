import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, DataTable, Text, InlineGrid, BlockStack } from "@shopify/polaris";
import { authenticate } from "~/shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);

  // Mock data for demonstration
  const totals = {
    pointsAwarded: 12345,
    pointsRedeemed: 5432,
    pointsOutstanding: 6913,
    referralUsage: 123,
  };

  const topUsers = [
    ["John Doe", 1500, 100, 1400],
    ["Jane Smith", 1200, 50, 1150],
    ["Peter Jones", 800, 200, 600],
  ];

  return json({ totals, topUsers });
};

export default function PointsPage() {
  const { totals, topUsers } = useLoaderData();

  const rows = topUsers.map((user) => [
    <Text as="span" fontWeight="bold">{user[0]}</Text>,
    user[1],
    user[2],
    user[3],
  ]);

  return (
    <Page>
      <Layout>
        <Layout.Section>
          <Text variant="headingLg" as="h1">
            Perq Points Dashboard
          </Text>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <InlineGrid columns={4} gap="400">
                <BlockStack gap="100" align="center">
                  <Text variant="headingMd" as="h2">Points Awarded</Text>
                  <Text variant="headingLg" as="p">{totals.pointsAwarded}</Text>
                </BlockStack>
                <BlockStack gap="100" align="center">
                  <Text variant="headingMd" as="h2">Points Redeemed</Text>
                  <Text variant="headingLg" as="p">{totals.pointsRedeemed}</Text>
                </BlockStack>
                <BlockStack gap="100" align="center">
                  <Text variant="headingMd" as="h2">Points Outstanding</Text>
                  <Text variant="headingLg" as="p">{totals.pointsOutstanding}</Text>
                </BlockStack>
                <BlockStack gap="100" align="center">
                  <Text variant="headingMd" as="h2">Referral Usage</Text>
                  <Text variant="headingLg" as="p">{totals.referralUsage}</Text>
                </BlockStack>
              </InlineGrid>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Text variant="headingMd" as="h2">Top Users</Text>
            <DataTable
              columnContentTypes={[
                "text",
                "numeric",
                "numeric",
                "numeric",
              ]}
              headings={[
                "User",
                "Points Awarded",
                "Points Redeemed",
                "Points Outstanding",
              ]}
              rows={rows}
              increasedTableDensity
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
