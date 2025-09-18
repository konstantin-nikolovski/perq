import type { LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  const { code } = params;
  const url = new URL(request.url);
  const to = url.searchParams.get("to") || "/";

  if (!code) return redirect(to);

  const expires = new Date();
  expires.setDate(expires.getDate() + 30);
  const cookie = `perq_ref=${encodeURIComponent(code)}; Path=/; Expires=${expires.toUTCString()}; SameSite=Lax`;

  return redirect(to, {
    headers: {
      "Set-Cookie": cookie,
    },
  });
};

export const action = loader;

