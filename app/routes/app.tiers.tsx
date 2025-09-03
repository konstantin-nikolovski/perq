
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  DataTable,
  Button,
} from "@shopify/polaris";

export default function TiersPage() {
  const tiers = [
    ["Bronze", "0", "299"],
    ["Silver", "300", "999"],
    ["Gold", "1000", "Infinity"],
  ];

  const handleAddTier = () => {
    // TODO: Open a modal or navigate to a new page to create a tier.
    console.log("Add tier clicked");
  };

  return (
    <Page
      title="Tiers"
      primaryAction={{
        content: "Add tier",
        onAction: handleAddTier,
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="p" variant="bodyMd">
                Tiers reward customers for reaching certain point thresholds.
                When a customer reaches a tier, a tag is added to their
                profile, which you can use for segmentation and gating.
              </Text>
              <DataTable
                columnContentTypes={["text", "numeric", "numeric"]}
                headings={["Tier Name", "Points From", "Points To"]}
                rows={tiers}
              />
              {/* TODO: Add form fields here to edit tier names and thresholds. */}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
