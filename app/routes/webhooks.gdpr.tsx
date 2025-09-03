import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload, admin } = await authenticate.webhook(request);

  switch (topic) {
    case "customers/data_request":
      console.log(`GDPR Webhook: Customer Data Request for shop: ${shop}, customer: ${payload.customer.id}`);
      // TODO: Implement logic to provide customer data
      break;
    case "customers/redact":
      console.log(`GDPR Webhook: Customer Redact for shop: ${shop}, customer: ${payload.customer.id}`);
      // TODO: Implement logic to delete customer data
      break;
    case "shop/redact":
      console.log(`GDPR Webhook: Shop Redact for shop: ${shop}`);
      // TODO: Implement logic to delete all shop data
      break;
    default:
      console.warn(`Unhandled webhook topic: ${topic}`);
  }

  return new Response(null, { status: 200 });
};
