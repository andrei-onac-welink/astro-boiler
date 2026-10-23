import { getEntry } from "astro:content";
import type { APIRoute } from "astro";
import { getAuthSession } from "@lib/auth.ts";
import { getDatabase } from "@lib/database.ts";

async function authenticatedUserId(request: Request): Promise<string | null> {
  const session = await getAuthSession(request);
  return session?.user.id ?? null;
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

function unauthorized(): Response {
  return Response.json({ error: "Authentication required" }, { status: 401 });
}

export const GET: APIRoute = async ({ params, request }) => {
  const userId = await authenticatedUserId(request);
  if (!userId) return unauthorized();

  const favorite = await getDatabase()
    .prepare('SELECT 1 FROM "publication_favorite" WHERE "userId" = ? AND "publicationId" = ? LIMIT 1')
    .bind(userId, params.publicationId)
    .first();

  return Response.json({ favorite: Boolean(favorite) });
};

export const POST: APIRoute = async ({ params, request }) => {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });

  const userId = await authenticatedUserId(request);
  if (!userId) return unauthorized();

  const publicationId = params.publicationId;
  if (!publicationId || !(await getEntry("publication", publicationId))) {
    return Response.json({ error: "Publication not found" }, { status: 404 });
  }

  await getDatabase()
    .prepare('INSERT OR IGNORE INTO "publication_favorite" ("userId", "publicationId") VALUES (?, ?)')
    .bind(userId, publicationId)
    .run();

  return Response.json({ favorite: true });
};

export const DELETE: APIRoute = async ({ params, request }) => {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });

  const userId = await authenticatedUserId(request);
  if (!userId) return unauthorized();

  await getDatabase()
    .prepare('DELETE FROM "publication_favorite" WHERE "userId" = ? AND "publicationId" = ?')
    .bind(userId, params.publicationId)
    .run();

  return Response.json({ favorite: false });
};
