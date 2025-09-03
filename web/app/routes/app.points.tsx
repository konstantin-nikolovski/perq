import { Card, Page, Layout, Text, DataTable } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function PointsAnalyticsPage() {
  const rows = [
    ['Customer A', '1,200', '500'],
    ['Customer B', '800', '300'],
    ['Customer C', '600', '100'],
  ];

  return (
    <Page>
      <TitleBar title="Points & Analytics" />
      <Layout>
        <Layout.Section>
          <Card>
            <Text variant="headingMd" as="h2">
              Loyalty Program Overview
            </Text>
            <Layout>
              <Layout.Section oneHalf>
                <Card>
                  <Text variant="headingSm" as="h3">Total Points Awarded</Text>
                  <Text variant="headingLg" as="p">15,000</Text>
                </Card>
              </Layout.Section>
              <Layout.Section oneHalf>
                <Card>
                  <Text variant="headingSm" as="h3">Total Points Redeemed</Text>
                  <Text variant="headingLg" as="p">5,000</Text>
                </Card>
              </Layout.Section>
            </Layout>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <Text variant="headingMd" as="h2">
              Top Users (Mock Data)
            </Text>
            <DataTable
              columnContentTypes={[
                'text',
                'numeric',
                'numeric',
              ]}
              headings={[
                'Customer Name',
                'Points Earned',
                'Points Redeemed',
              ]}
              rows={rows}
              footerContent={`Showing ${rows.length} of ${rows.length} results`}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
