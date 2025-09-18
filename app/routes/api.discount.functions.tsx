import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";

const FUNC_LIST = `#graphql
  query ListFunctions { appFunctions(first: 50) { nodes { id handle title apiType } } }
`;
const FUNC_BY_HANDLE = `#graphql
  query GetFunctionByHandle($handle: String!) { appFunctionByHandle(handle: $handle) { id title apiType } }
`;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { admin } = await authenticate.admin(request);
    if (!admin) return json({ ok: false, message: "Unauthorized" });
    const res = await admin.graphql(FUNC_LIST);
    const js = await res.json();
    const nodes = js?.data?.appFunctions?.nodes || [];
    let byHandle: any = null;
    try {
      const r2 = await admin.graphql(FUNC_BY_HANDLE, { variables: { handle: 'points-discount' } });
      const j2 = await r2.json();
      byHandle = j2?.data?.appFunctionByHandle || null;
      return json({ ok: true, nodes, byHandle, raw: { list: js, byHandle: j2 } });
    } catch {
      return json({ ok: true, nodes, byHandle, raw: { list: js } });
    }
  } catch (e: any) {
    return json({ ok: false, message: e?.message || "Failed to list appFunctions" });
  }
};
