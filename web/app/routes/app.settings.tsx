import { Card, Page, Layout, Text } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function SettingsPage() {
  return (
    <Page>
      <TitleBar title="Settings" />
      <Layout>
        <Layout.Section>
          <Card>
            <Text variant="headingMd" as="h2">
              App Settings
            </Text>
            <p>Manage your loyalty program's general settings here.</p>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
