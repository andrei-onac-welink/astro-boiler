import type { Loader, LoaderContext } from "astro/loaders";
import { config } from "../../config";
import { deduplicateByDocumentId, digest, fetchAll, fingerprintPath } from "./client";
import type { StrapiRecord } from "./types";

type LoaderOptions<TInput extends StrapiRecord, TOutput extends Record<string, unknown>> = {
  name: string;
  path: string;
  fixtures: TInput[];
  version?: string;
  mapEntry: (entry: TInput, context: Pick<LoaderContext, "renderMarkdown">) => TOutput | Promise<TOutput>;
};

function readEnvironment(name: string): string | undefined {
  return process.env[name] ?? import.meta.env[name];
}

function fixturesEnabled(): boolean {
  return readEnvironment("USE_CONTENT_FIXTURES") !== "false";
}

export function strapiLoader<TInput extends StrapiRecord, TOutput extends Record<string, unknown>>(
  options: LoaderOptions<TInput, TOutput>,
): Loader {
  return {
    name: options.name,
    load: async ({ store, parseData, renderMarkdown, generateDigest, meta, logger }) => {
      const fixtureMode = fixturesEnabled();
      const apiUrl = readEnvironment("STRAPI_API_URL");
      const token = readEnvironment("STRAPI_API_TOKEN");

      if (!fixtureMode && !apiUrl) {
        throw new Error("STRAPI_API_URL is required when USE_CONTENT_FIXTURES=false");
      }

      let entries: TInput[];
      let fingerprint: string;

      if (fixtureMode) {
        entries = deduplicateByDocumentId(options.fixtures);
        fingerprint = await digest({ entries, version: options.version });
      } else {
        const baseOptions = {
          apiUrl: apiUrl!,
          includeDrafts: config.includeDrafts,
          token,
        };
        const probe = await fetchAll<TInput>({
          ...baseOptions,
          path: fingerprintPath(options.path),
        });
        fingerprint = await digest({
          entries: probe.map(({ documentId, publishedAt, updatedAt }) => ({
            documentId,
            publishedAt,
            updatedAt,
          })),
          version: options.version,
        });

        if (meta.get("fingerprint") === fingerprint) {
          logger.info(`${options.name}: unchanged, keeping persisted store`);
          return;
        }

        entries = await fetchAll<TInput>({
          ...baseOptions,
          path: options.path,
        });
      }

      if (meta.get("fingerprint") === fingerprint) {
        logger.info(`${options.name}: unchanged, keeping persisted store`);
        return;
      }

      const activeIds = new Set<string>();
      for (const entry of entries) {
        const id = entry.documentId;
        const data = await parseData({
          id,
          data: await options.mapEntry(entry, { renderMarkdown }),
        });
        activeIds.add(id);
        store.set({
          id,
          data,
          digest: generateDigest(data),
        });
      }

      for (const id of store.keys()) {
        if (!activeIds.has(id)) {
          store.delete(id);
        }
      }

      meta.set("fingerprint", fingerprint);
      logger.info(`${options.name}: stored ${activeIds.size} entries`);
    },
  };
}
