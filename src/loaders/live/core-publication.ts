import type { LiveLoader } from "astro/loaders";
import { corePublicationSchema, type CorePublication } from "@schemas/core-publication.ts";

const SUCCESS_TTL_SECONDS = 300;
const CORE_TIMEOUT_MS = 5000;

type CloudflareCacheStorage = CacheStorage & { default: Cache };
type CorePublicationEntryFilter = { id: string };

export class CorePublicationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CorePublicationError";
  }
}

function publicationEndpoint(coreApiUrl: string | undefined, uuid: string): string {
  const base = String(coreApiUrl || "").trim();
  if (!base) {
    throw new CorePublicationError("CORE_API_URL is not configured");
  }

  return new URL(`website/publications/${encodeURIComponent(uuid)}`, `${base.replace(/\/+$/, "")}/`).toString();
}

function cacheKey(uuid: string): Request {
  return new Request(`https://lt-core-cache.invalid/publications/${encodeURIComponent(uuid.toLowerCase())}`, {
    method: "GET",
  });
}

function defaultCache(): Cache | undefined {
  return (globalThis.caches as CloudflareCacheStorage | undefined)?.default;
}

async function readCachedPublication(uuid: string): Promise<CorePublication | undefined> {
  const cache = defaultCache();
  if (!cache) return undefined;

  const response = await cache.match(cacheKey(uuid));
  if (!response) return undefined;

  const payload = await response.json().catch(() => null);
  const parsed = corePublicationSchema.safeParse(payload);
  if (!parsed.success || parsed.data.publication.uuid.toLowerCase() !== uuid.toLowerCase()) {
    await cache.delete(cacheKey(uuid));
    return undefined;
  }

  return parsed.data;
}

async function cachePublication(uuid: string, payload: CorePublication): Promise<void> {
  const cache = defaultCache();
  if (!cache) return;

  await cache.put(
    cacheKey(uuid),
    Response.json(payload, {
      headers: {
        "Cache-Control": `public, max-age=${SUCCESS_TTL_SECONDS}`,
      },
    }),
  );
}

async function fetchPublication(uuid: string): Promise<CorePublication | undefined> {
  const token = String(process.env.CORE_API_TOKEN || "").trim();
  if (!token) {
    throw new CorePublicationError("CORE_API_TOKEN is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CORE_TIMEOUT_MS);

  try {
    const response = await fetch(publicationEndpoint(process.env.CORE_API_URL, uuid), {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    });

    if (response.status === 404) return undefined;
    if (!response.ok) {
      throw new CorePublicationError(`Core publication lookup returned ${response.status}`);
    }

    const payload = await response.json().catch((error: unknown) => {
      throw new CorePublicationError("Core publication response was not JSON", { cause: error });
    });
    const parsed = corePublicationSchema.safeParse(payload);
    if (!parsed.success || parsed.data.publication.uuid.toLowerCase() !== uuid.toLowerCase()) {
      throw new CorePublicationError("Core publication response did not match the expected contract");
    }

    await cachePublication(uuid, parsed.data);
    return parsed.data;
  } catch (error) {
    if (error instanceof CorePublicationError) throw error;
    throw new CorePublicationError("Core website request failed", { cause: error });
  } finally {
    clearTimeout(timeout);
  }
}

export function corePublicationLoader(): LiveLoader<
  CorePublication,
  CorePublicationEntryFilter,
  never,
  CorePublicationError
> {
  return {
    name: "core-publication",
    loadCollection: async () => ({ entries: [] }),
    loadEntry: async ({ filter }) => {
      const uuid = filter.id;
      const cached = await readCachedPublication(uuid);
      if (cached) {
        return {
          id: uuid,
          data: cached,
          cacheHint: { tags: [`core-publication-${uuid}`] },
        };
      }

      try {
        const payload = await fetchPublication(uuid);
        if (!payload) return undefined;

        return {
          id: uuid,
          data: payload,
          cacheHint: { tags: [`core-publication-${uuid}`] },
        };
      } catch (error) {
        return {
          error:
            error instanceof CorePublicationError
              ? error
              : new CorePublicationError("Core publication lookup failed", { cause: error }),
        };
      }
    },
  };
}
