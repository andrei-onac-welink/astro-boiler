import { defineMiddleware } from "astro:middleware";

const UUID_PATTERN = "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const PUBLICATION_PATH = new RegExp(`^/publication/(${UUID_PATTERN})/?$`, "i");

export const onRequest = defineMiddleware(async (context, next) => {
  const match = context.url.pathname.match(PUBLICATION_PATH);
  if (!match) return next();

  if (!new Set(["GET", "HEAD"]).has(context.request.method)) {
    return new Response(context.request.method === "HEAD" ? null : "Method Not Allowed", {
      status: 405,
      headers: {
        Allow: "GET, HEAD",
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  }

  const staticResponse = await next();
  if (staticResponse.status !== 404) return staticResponse;

  const headers = new Headers(context.request.headers);
  headers.set("x-lt-core-publication-fallback", "1");
  const internalUrl = new URL(`/internal/publication/${match[1]}/`, context.url);

  return context.rewrite(
    new Request(internalUrl, {
      headers,
      method: context.request.method,
    }),
  );
});
