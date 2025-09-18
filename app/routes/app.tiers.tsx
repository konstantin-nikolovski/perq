import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Form, useNavigation } from "@remix-run/react";
import { Page, Layout, Card, BlockStack, Text, DataTable, Button, TextField, FormLayout } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

const SHOP_TIERS_QUERY = `#graphql
  query ShopTiers { shop { id tiers: metafield(namespace:"custom", key:"loyalty_tiers") { value } } }`;
const METAFIELDS_SET = `#graphql
  mutation MetafieldsSetTiers($metafields:[MetafieldsSetInput!]!) { metafieldsSet(metafields:$metafields) { metafields { id } userErrors { field message } } }`;

const sampleTiers = [
  { name: "Bronze", from: 0, to: 299, tag: "tier-bronze" },
  { name: "Silver", from: 300, to: 999, tag: "tier-silver" },
  { name: "Gold", from: 1000, to: null, tag: "tier-gold" },
];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const res = await admin.graphql(SHOP_TIERS_QUERY);
  const data = await res.json();
  let tiers = sampleTiers;
  try {
    const raw = data.data.shop.tiers?.value;
    if (raw) tiers = JSON.parse(raw);
  } catch {}
  return json({ tiers });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const form = await request.formData();
  const tiersJson = String(form.get("tiersJson") || "");
  let tiersParsed = sampleTiers;
  try {
    if (tiersJson) tiersParsed = JSON.parse(tiersJson);
  } catch (e) {
    return json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const shopRes = await admin.graphql(`{ shop { id } }`);
  const shopJson = await shopRes.json();
  const shopId = shopJson.data.shop.id;
  const save = await admin.graphql(METAFIELDS_SET, {
    variables: {
      metafields: [
        { ownerId: shopId, namespace: "custom", key: "loyalty_tiers", type: "json", value: JSON.stringify(tiersParsed) },
      ],
    },
  });
  const saveJs = await save.json();
  const errors = saveJs.data?.metafieldsSet?.userErrors || [];
  if (errors.length) return json({ ok: false, errors }, { status: 400 });
  return json({ ok: true });
};

export default function TiersPage() {
  const { tiers } = useLoaderData<typeof loader>();
  const nav = useNavigation();
  const [tiersList, setTiersList] = useState<Array<{ name: string; from: string; to: string; tag: string }>>(
    tiers.map((t: any) => ({ name: t.name, from: String(t.from), to: t.to === null ? "" : String(t.to), tag: t.tag || "" })),
  );
  const rows = tiersList.map((t) => [t.name, t.from, t.to === "" ? "∞" : t.to]);

  return (
    <Page title="Tiers">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="p" variant="bodyMd">Tiers reward customers for reaching certain point thresholds. When a customer reaches a tier, add the corresponding tag using Flow (e.g., tier-silver).</Text>
              <DataTable columnContentTypes={["text", "numeric", "numeric"]} headings={["Tier Name", "Points From", "Points To"]} rows={rows} />
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Form method="post">
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingMd">Edit tiers</Text>
                {tiersList.map((tier, idx) => (
                  <FormLayout key={idx}>
                    <TextField label="Name" value={tier.name} onChange={(v) => {
                      const next = [...tiersList];
                      next[idx] = { ...next[idx], name: v };
                      setTiersList(next);
                    }} autoComplete="off" />
                    <TextField label="From points" type="number" value={tier.from} onChange={(v) => {
                      const next = [...tiersList];
                      next[idx] = { ...next[idx], from: v };
                      setTiersList(next);
                    }} autoComplete="off" />
                    <TextField label="To points (blank = ∞)" type="number" value={tier.to} onChange={(v) => {
                      const next = [...tiersList];
                      next[idx] = { ...next[idx], to: v };
                      setTiersList(next);
                    }} autoComplete="off" />
                    <TextField label="Tag" value={tier.tag} onChange={(v) => {
                      const next = [...tiersList];
                      next[idx] = { ...next[idx], tag: v };
                      setTiersList(next);
                    }} autoComplete="off" helpText="e.g., tier-silver (used by Flow)" />
                    <Button destructive onClick={() => setTiersList(tiersList.filter((_, i) => i !== idx))}>Remove tier</Button>
                  </FormLayout>
                ))}
                <Button onClick={() => setTiersList([...tiersList, { name: "", from: "0", to: "", tag: "" }])}>Add tier</Button>
                <input
                  type="hidden"
                  name="tiersJson"
                  value={JSON.stringify(tiersList.map(t => ({ name: t.name, from: Number(t.from || 0), to: t.to === "" ? null : Number(t.to), tag: t.tag })))}
                  readOnly
                />
                <Button submit primary loading={nav.state !== "idle"}>Save tiers</Button>
              </BlockStack>
            </Card>
          </Form>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
