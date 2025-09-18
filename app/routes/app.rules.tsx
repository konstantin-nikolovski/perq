
import { useEffect, useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData, Form, useNavigation, useActionData, useFetcher, useLocation } from "@remix-run/react";
import { Page, Layout, Card, BlockStack, TextField, Button, FormLayout, Text, Banner } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import { useAppBridge } from "@shopify/app-bridge-react";

const SHOP_SETTINGS_QUERY = `#graphql
  query ShopSettings {
    shop {
      id
      earn: metafield(namespace:"custom", key:"loyalty_earn_rules") { value }
      ladder: metafield(namespace:"custom", key:"loyalty_ladder") { value }
    }
  }`;

const METAFIELDS_SET = `#graphql
  mutation MetafieldsSetRules($metafields:[MetafieldsSetInput!]!) {
    metafieldsSet(metafields:$metafields) {
      metafields { id key namespace }
      userErrors { field message }
    }
  }`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(SHOP_SETTINGS_QUERY);
  const data = await response.json();
  const shop = data.data.shop;

  const earnDefault = { newsletter: 50, perEuro: 1, perItem: 10 };
  const ladderDefault = [
    { points: 100, type: "amount", value: 10 },
    { points: 200, type: "amount", value: 22 },
  ];

  let earn = earnDefault;
  let ladder = ladderDefault as Array<{ points: number; type: "amount" | "percentage"; value: number }>;
  try {
    if (shop.earn?.value) earn = JSON.parse(shop.earn.value);
  } catch {}
  try {
    if (shop.ladder?.value) {
      const parsed = JSON.parse(shop.ladder.value);
      if (Array.isArray(parsed)) {
        ladder = parsed
          .map((s: any) => ({
            points: Number(s.points),
            type: (String(s.type || (typeof s.amount !== 'undefined' ? 'amount' : 'amount')).toLowerCase() === 'percentage') ? 'percentage' : 'amount',
            value: Number(typeof s.value !== 'undefined' ? s.value : s.amount),
          }))
          .filter((s) => Number.isFinite(s.points) && Number.isFinite(s.value));
      } else {
        ladder = ladderDefault;
      }
    }
  } catch {}

  return json({ earn, ladder });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const form = await request.formData();
  const earn = {
    newsletter: parseInt(String(form.get("newsletterPoints") || "50"), 10),
    perEuro: parseInt(String(form.get("pointsPerEuro") || "1"), 10),
    perItem: parseInt(String(form.get("pointsPerItem") || "10"), 10),
  };
  let ladder = [] as Array<{ points: number; type: 'amount'|'percentage'; value: number }>;
  try {
    const raw = String(form.get("ladderJson") || "");
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      ladder = parsed
        .map((s) => ({ points: Number(s.points), type: s.type === 'percentage' ? 'percentage' : 'amount', value: Number(s.value) }))
        .filter((s) => Number.isFinite(s.points) && Number.isFinite(s.value));
    }
  } catch {}

  // Minimal server-side validation
  const errors: string[] = [];
  if (ladder.length === 0) errors.push("Add at least one ladder step.");
  const byPoints = [...ladder].sort((a, b) => a.points - b.points);
  for (let i = 0; i < byPoints.length; i++) {
    const s = byPoints[i];
    if (s.points <= 0 || s.value <= 0) errors.push("Points and value must be positive.");
    if (s.type === "percentage" && (s.value <= 0 || s.value > 100)) errors.push("Percentage must be between 1 and 100.");
    if (i > 0 && byPoints[i - 1].points === s.points) errors.push("Duplicate point thresholds are not allowed.");
    if (i > 0 && byPoints[i - 1].points > s.points) errors.push("Ladder must be sorted ascending by points.");
  }
  if (byPoints.length > 20) errors.push("Too many steps (max 20).");
  if (errors.length) return json({ ok: false, errors }, { status: 400 });

  const shopRes = await admin.graphql(`{ shop { id } }`);
  const shopJson = await shopRes.json();
  const shopId = shopJson.data.shop.id;

  const setRes = await admin.graphql(METAFIELDS_SET, {
    variables: {
      metafields: [
        { ownerId: shopId, namespace: "custom", key: "loyalty_earn_rules", type: "json", value: JSON.stringify(earn) },
        { ownerId: shopId, namespace: "custom", key: "loyalty_ladder", type: "json", value: JSON.stringify(ladder) },
      ],
    },
  });
  const setData = await setRes.json();
  const apiErrors = setData.data?.metafieldsSet?.userErrors || [];
  if (apiErrors.length) return json({ ok: false, errors: apiErrors }, { status: 400 });
  return json({ ok: true });
};

export default function RulesPage() {
  const { earn, ladder } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>() as any;
  const nav = useNavigation();
  const discountFetcher = useFetcher<{ ok: boolean; message?: string; debug?: any }>();
  const location = useLocation();
  const functionIdFromUrl = (() => {
    try {
      const sp = new URLSearchParams(location.search);
      return sp.get('functionId') || sp.get('function_id') || '';
    } catch {
      return '';
    }
  })();
  const shopify = useAppBridge();
  const functionsFetcher = useFetcher<{ ok: boolean; nodes?: Array<{ id: string; handle?: string; title?: string; apiType?: string }> }>();
  const [newsletterPoints, setNewsletterPoints] = useState(String(earn.newsletter));
  const [pointsPerEuro, setPointsPerEuro] = useState(String(earn.perEuro));
  const [pointsPerItem, setPointsPerItem] = useState(String(earn.perItem));
  const [ladderSteps, setLadderSteps] = useState<Array<{ points: string; type: 'amount'|'percentage'; value: string }>>(
    (ladder || []).map((s: any) => ({ points: String(s.points), type: (s.type === 'percentage' ? 'percentage' : 'amount'), value: String(typeof s.value !== 'undefined' ? s.value : s.amount) })),
  );
  const submitting = nav.state !== "idle";

  useEffect(() => {
    if (!discountFetcher.data) return;
    if (discountFetcher.data.ok) {
      shopify.toast.show("Points discount activated");
    } else {
      // Log debug payload for diagnosis
      if ((discountFetcher.data as any).debug) {
        // eslint-disable-next-line no-console
        console.log("appFunctions debug", (discountFetcher.data as any).debug);
      }
      shopify.toast.show(discountFetcher.data.message || "Failed to activate points discount", { isError: true });
    }
  }, [discountFetcher.data, shopify]);

  useEffect(() => {
    if (!functionsFetcher.data) return;
    // eslint-disable-next-line no-console
    console.log('functions list', functionsFetcher.data);
    if (!functionsFetcher.data.ok) {
      shopify.toast.show('Failed to list functions', { isError: true });
    }
  }, [functionsFetcher.data, shopify]);

  return (
    <Page title="Earn & Redeem rules" subtitle="Define how customers collect and use points">
      <Layout>
        <Layout.Section>
          <Form method="post">
            <Card>
              <BlockStack gap="500">
                {actionData?.errors?.length ? (
                  <Banner tone="critical" title="Cannot save ladder">
                    <ul>
                      {actionData.errors.map((e: string, i: number) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </Banner>
                ) : null}
                <Text as="h2" variant="headingMd">Earning Points</Text>
                <FormLayout>
                  <TextField label="Newsletter subscription" type="number" name="newsletterPoints" value={newsletterPoints} onChange={setNewsletterPoints} autoComplete="off" />
                  <TextField label="Points per € spent" type="number" name="pointsPerEuro" value={pointsPerEuro} onChange={setPointsPerEuro} autoComplete="off" />
                  <TextField label="Points per item bought" type="number" name="pointsPerItem" value={pointsPerItem} onChange={setPointsPerItem} autoComplete="off" />
                </FormLayout>
              </BlockStack>
            </Card>
            <Card>
              <BlockStack gap="500">
                <Text as="h2" variant="headingMd">Redemption ladder</Text>
                <Text as="p" variant="bodyMd">Map points to a discount value. Each step can be amount or percentage.</Text>
                {ladderSteps.map((step, idx) => (
                  <FormLayout key={idx}>
                    <TextField
                      label="Points"
                      type="number"
                      value={step.points}
                      onChange={(v) => {
                        const next = [...ladderSteps];
                        next[idx] = { ...next[idx], points: v } as any;
                        setLadderSteps(next);
                      }}
                      autoComplete="off"
                    />
                    <div>
                      <Text as="p" variant="bodyMd">Type</Text>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <label><input type="radio" name={`type-${idx}`} value="amount" checked={step.type === 'amount'} onChange={() => {
                          const next = [...ladderSteps];
                          next[idx] = { ...next[idx], type: 'amount' } as any;
                          setLadderSteps(next);
                        }} /> Amount</label>
                        <label><input type="radio" name={`type-${idx}`} value="percentage" checked={step.type === 'percentage'} onChange={() => {
                          const next = [...ladderSteps];
                          next[idx] = { ...next[idx], type: 'percentage' } as any;
                          setLadderSteps(next);
                        }} /> Percentage</label>
                      </div>
                    </div>
                    <TextField
                      label={step.type === 'percentage' ? 'Discount percentage' : 'Discount amount'}
                      type="number"
                      value={step.value}
                      onChange={(v) => {
                        const next = [...ladderSteps];
                        next[idx] = { ...next[idx], value: v } as any;
                        setLadderSteps(next);
                      }}
                      autoComplete="off"
                      helpText={step.type === 'percentage' ? 'Percent (1–100)' : 'Currency amount in shop currency'}
                    />
                    <Button destructive onClick={() => setLadderSteps(ladderSteps.filter((_, i) => i !== idx))}>Remove step</Button>
                  </FormLayout>
                ))}
                <Button
                  onClick={() => {
                    const last = ladderSteps[ladderSteps.length - 1];
                    const nextPoints = last ? String((parseInt(last.points || '0', 10) || 0) + 100) : '100';
                    const nextValue = last ? last.value : '10';
                    setLadderSteps([...ladderSteps, { points: nextPoints, type: 'amount', value: nextValue }]);
                  }}
                >
                  Add step
                </Button>
                <input type="hidden" name="ladderJson" value={JSON.stringify(ladderSteps.map(s => ({ points: Number(s.points || 0), type: s.type, value: Number(s.value || 0) })))} readOnly />
                <Button submit primary loading={submitting}>Save</Button>
              </BlockStack>
            </Card>
          </Form>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">Activate points discount</Text>
              <Text as="p" variant="bodyMd">Create an automatic app discount bound to your points function so the discount applies at checkout. Run once per store.</Text>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <discountFetcher.Form method="post" action="/api/discount/install">
                  {functionIdFromUrl ? (
                    <input type="hidden" name="functionId" value={functionIdFromUrl} readOnly />
                  ) : null}
                  <Button submit variant="primary" loading={discountFetcher.state === "submitting"}>
                    Activate Points Discount
                  </Button>
                </discountFetcher.Form>
                <Button
                  onClick={() => functionsFetcher.load('/api/discount/functions')}
                  loading={functionsFetcher.state !== 'idle'}
                >
                  Debug: List functions
                </Button>
              </div>
              {functionsFetcher.data?.ok && (
                <Text as="p" variant="bodySm">
                  Found {functionsFetcher.data.nodes?.length || 0} functions. Check console for details.
                </Text>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
        <Layout.Section>
          <Card>
            <BlockStack gap="500">
              <Text as="h2" variant="headingMd">Automated Point Awards with Flow</Text>
              <Text as="p" variant="bodyMd">To award points automatically, use your app's "Perq – Adjust loyalty points" action in the Shopify Flow app. Follow our step-by-step guides to get started.</Text>
              <Button url="/docs/Flow.md" target="_blank" variant="primary">View Flow setup guide</Button>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
