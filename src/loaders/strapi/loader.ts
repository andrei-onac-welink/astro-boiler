import type { Loader, LoaderContext } from "astro/loaders";
import { config } from "@config/index.ts";
import { deduplicateByDocumentId, digest, fetchAll, fingerprintPath } from "./client";
import type { StrapiRecord } from "./types";

type LoaderOptions<TInput extends StrapiRecord, TOutput extends Record<string, unknown>> = {
  name: string;
  path: string;
  fingerprintPath?: string;
  fingerprintEntry?: (entry: TInput) => unknown;
  version?: string;
  mapEntry: (entry: TInput, context: Pick<LoaderContext, "renderMarkdown">) => TOutput | Promise<TOutput>;
};

function defaultFingerprintEntry({ documentId, publishedAt, updatedAt }: StrapiRecord) {
  return { documentId, publishedAt, updatedAt };
}

function readEnvironment(name: string): string | undefined {
  return process.env[name] ?? import.meta.env[name];
}

export function strapiLoader<TInput extends StrapiRecord, TOutput extends Record<string, unknown>>(
  options: LoaderOptions<TInput, TOutput>,
): Loader {
  return {
    name: options.name,
    load: async ({ store, parseData, renderMarkdown, generateDigest, meta, logger }) => {
      const apiUrl = readEnvironment("STRAPI_API_URL");
      const token = readEnvironment("STRAPI_API_TOKEN");

      logger.info(`${options.name}: source=strapi`);

      if (!apiUrl) {
        throw new Error("STRAPI_API_URL is required");
      }

      if (!token) {
        throw new Error("STRAPI_API_TOKEN is required");
      }

      const baseOptions = {
        apiUrl,
        includeDrafts: config.includeDrafts,
        token,
      };
      const probe = await fetchAll<TInput>({
        ...baseOptions,
        path: options.fingerprintPath ?? fingerprintPath(options.path),
      });
      const fingerprint = await digest({
        entries: probe.map(options.fingerprintEntry ?? defaultFingerprintEntry),
        version: options.version,
      });

      if (meta.get("fingerprint") === fingerprint) {
        logger.info(`${options.name}: unchanged, keeping persisted store`);
        return;
      }

      const entries = deduplicateByDocumentId(
        await fetchAll<TInput>({
          ...baseOptions,
          path: options.path,
        }),
      );

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
