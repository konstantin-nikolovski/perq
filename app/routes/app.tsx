import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Outlet, useLoaderData, useRouteError, useFetcher, useLocation } from "@remix-run/react";
import { useEffect } from "react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu, useAppBridge } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";


import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return { apiKey: process.env.SHOPIFY_API_KEY || "" };
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  const shopify = useAppBridge();
  const installer = useFetcher<{ ok: boolean; message?: string }>();
  const location = useLocation();

  // Auto-activate when Admin opens the app from the discount creation flow
  // Admin typically appends functionId/function_id as a query param.
  // We submit immediately and surface a toast.
  useEffect(() => {
    try {
      const sp = new URLSearchParams(location.search);
      const fid = sp.get('functionId') || sp.get('function_id');
      if (fid && installer.state === 'idle' && !installer.data) {
        const fd = new FormData();
        fd.append('functionId', fid);
        installer.submit(fd, { method: 'post', action: '/api/discount/install' });
      }
    } catch {}
  }, [location.search, installer.state]);

  useEffect(() => {
    if (!installer.data) return;
    if (installer.data.ok) {
      shopify.toast.show('Points discount activated');
    } else {
      shopify.toast.show(installer.data.message || 'Failed to activate points discount', { isError: true });
    }
  }, [installer.data, shopify]);

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <a href="/app">Dashboard</a>
        <a href="/app/points">Points</a>
        <a href="/app/rules">Rules</a>
        <a href="/app/tiers">Tiers</a>
        <a href="/app/analytics">Analytics</a>
        <a href="/app/settings">Settings</a>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
