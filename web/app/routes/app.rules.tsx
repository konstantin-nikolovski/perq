import { Card, Page, Layout, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function RulesPage() {
  return (
    <Page>
      <TitleBar title="Earning Rules" />
      <Layout>
        <Layout.Section>
          <Card>
            <Text variant="headingMd" as="h2">
              Points Earning Rules
            </Text>
            <p>Configure how customers earn loyalty points here.</p>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
