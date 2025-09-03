
import { useState, useCallback } from "react";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  TextField,
  Select,
  Button,
  FormLayout,
  Text,
} from "@shopify/polaris";

export default function RulesPage() {
  const [newsletterPoints, setNewsletterPoints] = useState("50");
  const [pointsPerEuro, setPointsPerEuro] = useState("1");
  const [pointsPerItem, setPointsPerItem] = useState("10");
  const [discountType, setDiscountType] = useState("fixed");
  const [redeemRate, setRedeemRate] = useState("100");

  const handleSave = () => {
    // TODO: POST form data to a Remix action to save the rules.
    // Example payload:
    const rules = {
      earn: {
        newsletter: parseInt(newsletterPoints, 10),
        perEuro: parseInt(pointsPerEuro, 10),
        perItem: parseInt(pointsPerItem, 10),
      },
      redeem: {
        type: discountType,
        rate: parseInt(redeemRate, 10), // e.g., 100 points = 1€
      },
    };
    console.log("Saving rules:", rules);
    // shopify.toast.show("Rules saved");
  };

  return (
    <Page
      title="Earn & Redeem rules"
      subtitle="Define how customers collect and use points"
      primaryAction={{
        content: "Save",
        onAction: handleSave,
      }}
    >
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Earning Points
              </Text>
              <FormLayout>
                <TextField
                  label="Newsletter subscription"
                  type="number"
                  value={newsletterPoints}
                  onChange={setNewsletterPoints}
                  autoComplete="off"
                  helpText="Points awarded when a customer subscribes."
                />
                <TextField
                  label="Points per € spent"
                  type="number"
                  value={pointsPerEuro}
                  onChange={setPointsPerEuro}
                  autoComplete="off"
                  helpText="Points awarded for each Euro spent."
                />
                <TextField
                  label="Points per item bought"
                  type="number"
                  value={pointsPerItem}
                  onChange={setPointsPerItem}
                  autoComplete="off"
                  helpText="Points awarded for each item in an order."
                />
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Redeeming Points
              </Text>
              <FormLayout>
                <Select
                  label="Discount type"
                  options={[
                    { label: "Fixed Amount", value: "fixed" },
                    { label: "Percentage", value: "percent" },
                  ]}
                  onChange={setDiscountType}
                  value={discountType}
                />
                <TextField
                  label="Redemption Rate"
                  type="number"
                  value={redeemRate}
                  onChange={setRedeemRate}
                  autoComplete="off"
                  helpText="e.g., '100' means 100 points = 1€ or 1% discount."
                />
              </FormLayout>
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">
                Automated Point Awards with Flow
              </Text>
              <Text as="p" variant="bodyMd">
                To award points automatically, use your app's "Perq – Adjust loyalty points" action in the Shopify Flow app. Follow our step-by-step guides to get started.
              </Text>
              <Button
                url="https://github.com/your-repo/perq/blob/main/docs/Flow.md" // Placeholder URL
                target="_blank"
                variant="primary"
              >
                View Flow setup guide
              </Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
