import type { APIRoute } from "astro";
import { createAuth } from "@lib/auth.ts";

export const ALL: APIRoute = ({ request }) => {
  const url = new URL(request.url);
  url.pathname = url.pathname.replace(/\/$/, "");
  const normalizedRequest = new Request(url, request);
  return createAuth(normalizedRequest).handler(normalizedRequest);
};
