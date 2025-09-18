import { Page, Layout, Card, Text, BlockStack, InlineGrid, DataTable, Badge } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

type Total = {
  label: string;
  value: string | number;
  tone?: "success" | "critical" | "attention" | "new" | "warning" | "info" | undefined;
};

export default function PointsAnalyticsPage() {
  const totals: Total[] = [
    { label: "Awarded (lifetime)", value: 128_450 },
    { label: "Redeemed (lifetime)", value: 83_120 },
    { label: "Outstanding", value: 45_330, tone: "attention" },
    { label: "Redeemed (30d)", value: 6_240 },
  ];

  const rows: (string | number | JSX.Element)[][] = [
    ["c_1024", "Ava Martinez", 1450, 320, 1130],
    ["c_2048", "Noah Schmidt", 1310, 450, 860],
    ["c_4096", "Mia Fischer", 1275, 0, 1275],
    ["c_8192", "Liam Weber", 1105, 900, 205],
    ["c_16384", "Emma Wagner", 980, 200, 780],
  ];

  return (
    <Page>
      <TitleBar title="Points & Analytics" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Totals
              </Text>
              <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
                {totals.map((t) => (
                  <Card key={t.label}>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodyMd" tone="subdued">
                        {t.label}
                      </Text>
                      <Text as="p" variant="headingLg">
                        {typeof t.value === "number" ? t.value.toLocaleString() : t.value}
                      </Text>
                      {t.tone ? <Badge tone={t.tone}>watch</Badge> : null}
                    </BlockStack>
                  </Card>
                ))}
              </InlineGrid>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Top Customers (mock)
              </Text>
              <DataTable
                columnContentTypes={["text", "text", "numeric", "numeric", "numeric"]}
                headings={["ID", "Name", "Awarded", "Redeemed", "Balance"]}
                rows={rows}
                totals={[
                  "",
                  "",
                  rows.reduce((acc, r) => acc + (r[2] as number), 0),
                  rows.reduce((acc, r) => acc + (r[3] as number), 0),
                  rows.reduce((acc, r) => acc + (r[4] as number), 0),
                ]}
              />
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

