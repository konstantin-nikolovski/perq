import { useState } from "react";
import { Card, Page, Layout, Text, Form, FormLayout, TextField, Button, DataTable, Toast } from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { useLoaderData, useActionData, useSubmit } from "@remix-run/react";
import { json, type ActionFunctionArgs, type LoaderFunctionArgs } from "@remix-run/node";
import { z } from "zod";
import { authenticate } from "../shopify.server";

// Zod schema for tier validation
const TierSchema = z.object({
  name: z.string().min(1, "Tier name is required"),
  threshold: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().int().min(0, "Threshold must be a non-negative integer")
  ),
  tag: z.string().min(1, "Associated tag is required"),
});

// Loader function to fetch existing tiers
export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
    query GetShopLoyaltyTiers {
      shop {
        metafield(namespace: "custom", key: "loyalty_tiers") {
          id
          value
        }
      }
    }`
  );
  const data = await response.json();
  const metafield = data.data?.shop?.metafield;
  let tiers = [];
  if (metafield && metafield.value) {
    try {
      tiers = JSON.parse(metafield.value);
    } catch (e) {
      console.error("Failed to parse loyalty_tiers metafield:", e);
    }
  }
  return json({ tiers, metafieldId: metafield?.id });
}

// Action function to handle form submissions (add/edit tiers)
export async function action({ request }: ActionFunctionArgs) {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const { _action, ...values } = Object.fromEntries(formData);

  try {
    if (_action === "addTier") {
      const newTier = TierSchema.parse(values);

      const response = await admin.graphql(
        `#graphql
        query GetShopLoyaltyTiers { 
          shop {
            metafield(namespace: "custom", key: "loyalty_tiers") {
              id
              value
            }
          }
        }`
      );
      const data = await response.json();
      const existingMetafield = data.data?.shop?.metafield;
      let existingTiers = [];
      if (existingMetafield && existingMetafield.value) {
        try {
          existingTiers = JSON.parse(existingMetafield.value);
        } catch (e) {
          console.error("Failed to parse existing loyalty_tiers metafield:", e);
        }
      }

      // Add new tier, ensure uniqueness by name or tag (simple check for now)
      const updatedTiers = [...existingTiers, newTier]; // Simple add, could add update logic later

      const metafieldInput = existingMetafield?.id
        ? { id: existingMetafield.id, value: JSON.stringify(updatedTiers) } 
        : { namespace: "custom", key: "loyalty_tiers", value: JSON.stringify(updatedTiers), type: "json" };

      const updateResponse = await admin.graphql(
        `#graphql
        mutation ShopMetafieldSet($metafield: ShopMetafieldInput!) {
          shopMetafieldSet(metafield: $metafield) {
            metafield {
              id
              value
            }
            userErrors {
              field
              message
            }
          }
        }`,
        {
          variables: {
            metafield: metafieldInput,
          },
        }
      );

      const updateData = await updateResponse.json();
      if (updateData.data?.shopMetafieldSet?.userErrors?.length > 0) {
        return json({ errors: updateData.data.shopMetafieldSet.userErrors, message: "Failed to save tier" }, { status: 500 });
      }
      return json({ success: true, message: "Tier added successfully!" });
    }
    return json({ message: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return json({ errors: error.errors, message: "Validation failed" }, { status: 400 });
    }
    console.error("Error in tiers action:", error);
    return json({ message: "Internal server error" }, { status: 500 });
  }
}

export default function TiersPage() {
  const { tiers } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const submit = useSubmit();

  const [tierName, setTierName] = useState("");
  const [threshold, setThreshold] = useState("");
  const [tag, setTag] = useState("");
  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState(false);

  const handleAddTier = () => {
    const formData = new FormData();
    formData.append("_action", "addTier");
    formData.append("name", tierName);
    formData.append("threshold", threshold);
    formData.append("tag", tag);
    submit(formData, { method: "post" });
  };

  // Show toast messages
  useState(() => {
    if (actionData?.message) {
      setToastMessage(actionData.message);
      setToastError(!!actionData.errors);
      setToastActive(true);
    }
  }, [actionData]);

  const toastMarkup = toastActive ? (
    <Toast content={toastMessage} error={toastError} onDismiss={() => setToastActive(false)} />
  ) : null;

  const rows = tiers.map((tier: any) => [tier.name, tier.threshold, tier.tag]);

  return (
    <Page>
      <TitleBar title="Tiers" />
      <Layout>
        <Layout.Section>
          <Card>
            <Text variant="headingMd" as="h2">
              Add New Loyalty Tier
            </Text>
            <Form onSubmit={handleAddTier}>
              <FormLayout>
                <TextField
                  label="Tier Name"
                  value={tierName}
                  onChange={setTierName}
                  autoComplete="off"
                  helpText="e.g., Silver, Gold, Platinum"
                  error={actionData?.errors?.find((e: any) => e.path?.includes("name"))?.message}
                />
                <TextField
                  label="Points Threshold"
                  value={threshold}
                  onChange={setThreshold}
                  type="number"
                  autoComplete="off"
                  helpText="Minimum points required for this tier"
                  error={actionData?.errors?.find((e: any) => e.path?.includes("threshold"))?.message}
                />
                <TextField
                  label="Associated Tag"
                  value={tag}
                  onChange={setTag}
                  autoComplete="off"
                  helpText="e.g., tier-silver (used by Shopify Flow)"
                  error={actionData?.errors?.find((e: any) => e.path?.includes("tag"))?.message}
                />
                <Button submit>Add Tier</Button>
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>

        <Layout.Section>
          <Card>
            <Text variant="headingMd" as="h2">
              Existing Loyalty Tiers
            </Text>
            {tiers.length > 0 ? (
              <DataTable
                columnContentTypes={[
                  "text",
                  "numeric",
                  "text",
                ]}
                headings={[
                  "Tier Name",
                  "Points Threshold",
                  "Associated Tag",
                ]}
                rows={rows}
                footerContent={`Showing ${rows.length} of ${tiers.length} tiers`}
              />
            ) : (
              <Text variant="bodyMd" as="p">No tiers defined yet. Add your first tier above.</Text>
            )}
          </Card>
        </Layout.Section>
      </Layout>
      {toastMarkup}
    </Page>
  );
}