import { Page, Layout, Card, Text, BlockStack } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function TiersPage() {
  return (
    <Page>
      <TitleBar title="Tiers" />
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="300">
              <Text variant="headingMd" as="h2">
                Tier Settings (placeholder)
              </Text>
              <Text as="p" tone="subdued">
                Configure thresholds and tags for Silver, Gold, etc. Coming soon.
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}

