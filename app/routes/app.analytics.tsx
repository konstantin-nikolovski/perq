
import { useState, useCallback } from "react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Select,
  InlineGrid,
  Text,
  DataTable,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

// Mock data loader
export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  const mockData = {
    stats: {
      newMembers: "152",
      referrals: "45",
      redemptions: "312",
    },
    recentEvents: [
      ["2024-05-30", "customer1@example.com", "Earn - Order", "+150"],
      ["2024-05-30", "customer2@example.com", "Redeem - Discount", "-500"],
      ["2024-05-29", "customer3@example.com", "Earn - Newsletter", "+50"],
      ["2024-05-28", "customer4@example.com", "Tier - Silver", "---"],
    ],
  };

  return json(mockData);
};

export default function AnalyticsPage() {
  const { stats, recentEvents } = useLoaderData<typeof loader>();
  const [dateRange, setDateRange] = useState("30");

  const handleDateRangeChange = useCallback(
    (value: string) => setDateRange(value),
    [],
  );

  return (
    <Page title="Analytics">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Select
                label="Date range"
                options={[
                  { label: "Last 7 days", value: "7" },
                  { label: "Last 30 days", value: "30" },
                  { label: "Last 90 days", value: "90" },
                ]}
                onChange={handleDateRangeChange}
                value={dateRange}
              />
              <InlineGrid columns={3} gap="400">
                <BlockStack gap="100" align="center">
                  <Text as="h3" variant="headingLg">
                    {stats.newMembers}
                  </Text>
                  <Text as="p" variant="bodyMd">
                    New members
                  </Text>
                </BlockStack>
                <BlockStack gap="100" align="center">
                  <Text as="h3" variant="headingLg">
                    {stats.referrals}
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Completed referrals
                  </Text>
                </BlockStack>
                <BlockStack gap="100" align="center">
                  <Text as="h3" variant="headingLg">
                    {stats.redemptions}
                  </Text>
                  <Text as="p" variant="bodyMd">
                    Redemptions
                  </Text>
                </BlockStack>
              </InlineGrid>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text as="h2" variant="headingMd">
                Recent point events
              </Text>
              <DataTable
                columnContentTypes={["text", "text", "text", "numeric"]}
                headings={["Date", "Customer", "Type", "Amount"]}
                rows={recentEvents}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
