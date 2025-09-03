import { useEffect } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  Link,
} from "@shopify/polaris";
import { useFetcher } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";

export default function SettingsPage() {
  const fetcher = useFetcher<{ success: boolean; errors?: any[] }>();
  const shopify = useAppBridge();

  const handleCreateMetafields = () => {
    fetcher.submit({}, { method: "post", action: "/api/metafields/create" });
  };

  useEffect(() => {
    if (fetcher.data) {
      if (fetcher.data.success) {
        shopify.toast.show("Metafield definitions created successfully.");
      } else {
        shopify.toast.show("Error creating metafield definitions.", {
          isError: true,
        });
      }
    }
  }, [fetcher.data, shopify]);

  return (
    <Page title="Settings">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Metafield Definitions
              </Text>
              <Text as="p" variant="bodyMd">
                Your store needs specific metafield definitions for customers
                and products to store loyalty data. Click the button to ensure
                they are created correctly.
              </Text>
              <fetcher.Form onSubmit={handleCreateMetafields}>
                <Button submit loading={fetcher.state === "submitting"}>
                  Create metafield definitions
                </Button>
              </fetcher.Form>
            </BlockStack>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Theme Integration
              </Text>
              <Text as="p" variant="bodyMd">
                To enable gating and on-page elements, you need to activate the
                app embed in your theme and set up the early access page.
              </Text>
              <BlockStack gap="200">
                <Link url="/admin/themes" target="_blank" removeUnderline>
                  Open Theme Editor
                </Link>
                <Link url="#" target="_blank" removeUnderline>
                  Docs: Early access page & App embed
                </Link>
              </BlockStack>
            </BlockStack>
            </Card>
          </Layout.Section>

        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Support
              </Text>
              <Text as="p" variant="bodyMd">
                For help or questions, please don't hesitate to reach out.
              </Text>
              <Button url="mailto:support@example.com">Contact Support</Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}