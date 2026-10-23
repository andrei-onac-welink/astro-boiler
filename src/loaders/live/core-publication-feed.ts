import type { LiveLoader } from "astro/loaders";
import { z } from "astro/zod";
import { corePublicationFeedEntrySchema, type CorePublicationFeedEntry } from "@schemas/core-publication-feed.ts";
import { CorePublicationError } from "./core-publication";

const FRESH_TTL_SECONDS = 300;
const LAST_GOOD_TTL_SECONDS = 86400;
const CORE_TIMEOUT_MS = 5000;
const MAX_CORE_PAGES = 100;

type CloudflareCacheStorage = CacheStorage & { default: Cache };

const coreFeedItemSchema = z.looseObject({
  identity: z.object({
    publicationUuid: z.uuid(),
  }),
  content: z.looseObject({
    title: z.string().min(1),
    author: z.string().min(1),
    poster: z.url(),
  }),
});

const coreFeedPageSchema = z.object({
  data: z.array(coreFeedItemSchema),
  links: z.looseObject({
    next: z.string().nullable(),
  }),
});

const cachedFeedSchema = z.object({
  storedAt: z.number(),
  data: z.array(corePublicationFeedEntrySchema),
});

function coreApiBase(): URL {
  const base = String(process.env.CORE_API_URL || "").trim();
  if (!base) throw new CorePublicationError("CORE_API_URL is not configured");

  return new URL(`${base.replace(/\/+$/, "")}/`);
}

function feedEndpoint(): string {
  return new URL("website/publications?per_page=100", coreApiBase()).toString();
}

function nextPageUrl(value: string | null): string | null {
  if (value === null) return null;

  const base = coreApiBase();
  const expected = new URL("website/publications", base);
  const next = new URL(value, base);
  if (next.origin !== expected.origin || next.pathname !== expected.pathname) {
    throw new CorePublicationError("Core feed returned an unexpected next-page link");
  }

  return next.toString();
}

function defaultCache(): Cache | undefined {
  return (globalThis.caches as CloudflareCacheStorage | undefined)?.default;
}

function cacheKey(): Request {
  return new Request("https://lt-core-cache.invalid/publications-feed", { method: "GET" });
}

async function readCachedFeed(): Promise<{ data: CorePublicationFeedEntry[]; fresh: boolean } | undefined> {
  const cache = defaultCache();
  if (!cache) return undefined;

  const response = await cache.match(cacheKey());
  if (!response) return undefined;

  const parsed = cachedFeedSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) {
    await cache.delete(cacheKey());
    return undefined;
  }

  const age = Math.max(0, Date.now() - parsed.data.storedAt);
  if (age > LAST_GOOD_TTL_SECONDS * 1000) return undefined;

  return {
    data: parsed.data.data,
    fresh: age <= FRESH_TTL_SECONDS * 1000,
  };
}

async function cacheFeed(data: CorePublicationFeedEntry[]): Promise<void> {
  const cache = defaultCache();
  if (!cache) return;

  await cache.put(
    cacheKey(),
    Response.json(
      { storedAt: Date.now(), data },
      { headers: { "Cache-Control": `public, max-age=${LAST_GOOD_TTL_SECONDS}` } },
    ),
  );
}

async function fetchCorePage(url: string, token: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CORE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new CorePublicationError(`Core publication feed returned ${response.status}`);

    const parsed = coreFeedPageSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) throw new CorePublicationError("Core publication feed did not match the expected contract");

    return parsed.data;
  } catch (error) {
    if (error instanceof CorePublicationError) throw error;
    throw new CorePublicationError("Core publication feed request failed", { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchFeed(): Promise<CorePublicationFeedEntry[]> {
  const token = String(process.env.CORE_API_TOKEN || "").trim();
  if (!token) throw new CorePublicationError("CORE_API_TOKEN is not configured");

  const entries = new Map<string, CorePublicationFeedEntry>();
  const visited = new Set<string>();
  let url: string | null = feedEndpoint();

  for (let page = 0; url && page < MAX_CORE_PAGES; page += 1) {
    if (visited.has(url)) throw new CorePublicationError("Core publication feed pagination contains a loop");
    visited.add(url);

    const payload = await fetchCorePage(url, token);
    for (const item of payload.data) {
      const entry = {
        uuid: item.identity.publicationUuid,
        title: item.content.title,
        author: item.content.author,
        poster: item.content.poster,
      };
      entries.set(entry.uuid.toLowerCase(), entry);
    }
    url = nextPageUrl(payload.links.next);
  }

  if (url !== null) throw new CorePublicationError("Core publication feed exceeded the pagination limit");

  return [...entries.values()];
}

export function corePublicationFeedLoader(): LiveLoader<CorePublicationFeedEntry, never, never, CorePublicationError> {
  return {
    name: "core-publication-feed",
    loadEntry: async () => undefined,
    loadCollection: async () => {
      const cached = await readCachedFeed();
      if (cached?.fresh) {
        return {
          entries: cached.data.map((data) => ({ id: data.uuid, data })),
          cacheHint: { tags: ["core-publication-feed"] },
        };
      }

      try {
        const data = await fetchFeed();
        await cacheFeed(data);
        return {
          entries: data.map((entry) => ({ id: entry.uuid, data: entry })),
          cacheHint: { tags: ["core-publication-feed"] },
        };
      } catch (error) {
        if (cached) {
          return {
            entries: cached.data.map((data) => ({ id: data.uuid, data })),
            cacheHint: { tags: ["core-publication-feed"] },
          };
        }

        return {
          error:
            error instanceof CorePublicationError
              ? error
              : new CorePublicationError("Core publication feed lookup failed", { cause: error }),
        };
      }
    },
  };
}
