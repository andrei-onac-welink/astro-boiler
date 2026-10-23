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
    .prepare('SELECT 1 FROM "publication_plus_favorite" WHERE "userId" = ? AND "publicationPlusId" = ? LIMIT 1')
    .bind(userId, params.publicationPlusId)
    .first();

  return Response.json({ favorite: Boolean(favorite) });
};

export const POST: APIRoute = async ({ params, request }) => {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });

  const userId = await authenticatedUserId(request);
  if (!userId) return unauthorized();

  const publicationPlusId = params.publicationPlusId;
  if (!publicationPlusId || !(await getEntry("publication-plus", publicationPlusId))) {
    return Response.json({ error: "Publication Plus entry not found" }, { status: 404 });
  }

  await getDatabase()
    .prepare('INSERT OR IGNORE INTO "publication_plus_favorite" ("userId", "publicationPlusId") VALUES (?, ?)')
    .bind(userId, publicationPlusId)
    .run();

  return Response.json({ favorite: true });
};

export const DELETE: APIRoute = async ({ params, request }) => {
  if (!sameOrigin(request)) return Response.json({ error: "Invalid origin" }, { status: 403 });

  const userId = await authenticatedUserId(request);
  if (!userId) return unauthorized();

  await getDatabase()
    .prepare('DELETE FROM "publication_plus_favorite" WHERE "userId" = ? AND "publicationPlusId" = ?')
    .bind(userId, params.publicationPlusId)
    .run();

  return Response.json({ favorite: false });
};
