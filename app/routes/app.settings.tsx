import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Page,
  Layout,
  Card,
  BlockStack,
  Text,
  Button,
  Link,
  Select,
} from "@shopify/polaris";
import { useFetcher, useLoaderData } from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";

type ThemeStyle = "inline" | "dawn" | "sense" | "craft";

const THEME_STYLE_OPTIONS: Array<{ label: string; value: ThemeStyle }> = [
  { label: "Inline (custom colors)", value: "inline" },
  { label: "Theme variables – Dawn", value: "dawn" },
  { label: "Theme variables – Sense", value: "sense" },
  { label: "Theme variables – Craft", value: "craft" },
];

const SHOP_THEME_STYLE_QUERY = `#graphql
  query ShopThemeStyle {
    shop {
      id
      themeStyle: metafield(namespace: "custom", key: "loyalty_theme_style") {
        value
      }
    }
  }
`;

const METAFIELDS_SET_MUTATION = `#graphql
  mutation SetThemeStyle($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields { id }
      userErrors { field message }
    }
  }
`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(SHOP_THEME_STYLE_QUERY);
  const payload = await response.json();
  const shop = payload.data?.shop;
  let themeStyle: ThemeStyle = "inline";
  const value = shop?.themeStyle?.value;
  if (value === "dawn" || value === "sense" || value === "craft") {
    themeStyle = value;
  }
  return json({ themeStyle });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const form = await request.formData();
  const intent = String(form.get("intent") || "");
  if (intent !== "update-theme-style") {
    return json({ ok: false, errors: ["Unknown intent"] }, { status: 400 });
  }
  const rawValue = String(form.get("themeStyle") || "inline");
  const allowed: ThemeStyle[] = ["inline", "dawn", "sense", "craft"];
  const themeStyle = allowed.includes(rawValue as ThemeStyle)
    ? (rawValue as ThemeStyle)
    : "inline";

  const shopResponse = await admin.graphql(SHOP_THEME_STYLE_QUERY);
  const shopPayload = await shopResponse.json();
  const shopId = shopPayload.data?.shop?.id;
  if (!shopId) {
    return json({ ok: false, errors: ["Unable to load shop information."] }, { status: 500 });
  }

  const mutation = await admin.graphql(METAFIELDS_SET_MUTATION, {
    variables: {
      metafields: [
        {
          ownerId: shopId,
          namespace: "custom",
          key: "loyalty_theme_style",
          type: "single_line_text_field",
          value: themeStyle,
        },
      ],
    },
  });
  const mutationPayload = await mutation.json();
  const errors = mutationPayload.data?.metafieldsSet?.userErrors || [];
  if (errors.length) {
    return json({ ok: false, errors }, { status: 400 });
  }

  return json({ ok: true, themeStyle });
};

export default function SettingsPage() {
  const { themeStyle } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<{ success: boolean; errors?: any[] }>();
  const themeFetcher = useFetcher<{ ok: boolean; errors?: any[]; themeStyle?: ThemeStyle }>();
  const shopify = useAppBridge();
  const [selectedThemeStyle, setSelectedThemeStyle] = useState<ThemeStyle>(themeStyle);

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

  useEffect(() => {
    if (!themeFetcher.data) return;
    if (themeFetcher.data.ok) {
      shopify.toast.show("Theme styling preference saved.");
    } else {
      shopify.toast.show("Failed to save theme styling preference.", {
        isError: true,
      });
    }
    if (themeFetcher.data.themeStyle) {
      setSelectedThemeStyle(themeFetcher.data.themeStyle);
    }
  }, [themeFetcher.data, shopify]);

  useEffect(() => {
    setSelectedThemeStyle(themeStyle);
  }, [themeStyle]);

  const handleThemeStyleChange = (value: string) => {
    const next = (value as ThemeStyle) || "inline";
    setSelectedThemeStyle(next);
    const formData = new FormData();
    formData.append("intent", "update-theme-style");
    formData.append("themeStyle", next);
    themeFetcher.submit(formData, { method: "post" });
  };

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
              <Select
                label="Button styling"
                options={THEME_STYLE_OPTIONS}
                onChange={handleThemeStyleChange}
                value={selectedThemeStyle}
                helpText="Use a theme option to pull colors and radius from your Online Store theme."
              />
              {themeFetcher.state === "submitting" && (
                <Text as="p" variant="bodySm" tone="subdued">
                  Saving preference…
                </Text>
              )}
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
