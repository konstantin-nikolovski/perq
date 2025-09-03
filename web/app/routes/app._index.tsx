import { Card, Page, Layout, Text, Link } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export default function Index() {
  return (
    <Page>
      <TitleBar title="Perq Loyalty App" primaryAction={null} />
      <Layout>
        <Layout.Section>
          <Card>
            <Text variant="headingMd" as="h2">
              Welcome to Perq Loyalty!
            </Text>
            <p>Manage your loyalty program settings, tiers, and view analytics.</p>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Layout.Section>
            <Card>
              <Text variant="headingMd" as="h2">
                Navigation
              </Text>
              <ul>
                <li>
                  <Link url="/app/settings">Settings</Link>
                </li>
                <li>
                  <Link url="/app/tiers">Tiers</Link>
                </li>
                <li>
                  <Link url="/app/points">Points & Analytics</Link>
                </li>
                <li>
                  <Link url="/app/rules">Earning Rules</Link>
                </li>
              </ul>
            </Card>
          </Layout.Section>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
