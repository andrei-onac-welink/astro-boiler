import { basicPageFixtures } from "./fixtures";
import { strapiLoader } from "./loader";
import type { StrapiRecord } from "./types";

type BasicPageRecord = StrapiRecord & {
  title: string;
  slug?: string | null;
  content?: string | null;
  blocks?: Array<Record<string, unknown> & { __component?: string }>;
  metaTags?: Record<string, unknown> | null;
  config?: {
    type?: string | null;
    layout?: string | null;
  } | null;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-");
}

async function mapBasicPage(
  entry: BasicPageRecord,
  { renderMarkdown }: { renderMarkdown: (content: string) => Promise<{ html: string }> },
) {
  const blocks = await Promise.all(
    (entry.blocks ?? []).map(async (block) => {
      if (block.__component !== "blocks.content" || typeof block.content !== "string") {
        return block;
      }

      const rendered = await renderMarkdown(block.content);
      return { ...block, contentHtml: rendered.html };
    }),
  );

  return {
    id: entry.id,
    documentId: entry.documentId,
    title: entry.title,
    type: "basic-page" as const,
    slug: entry.slug || slugify(entry.title),
    content: entry.content ?? undefined,
    blocks,
    metaTags: entry.metaTags ?? undefined,
    configType: entry.config?.type ?? "page",
    layout: entry.config?.layout ?? "page",
    publishedAt: entry.publishedAt,
    updatedAt: entry.updatedAt,
    strapiStatus: entry.strapiStatus ?? (entry.publishedAt ? "published" : "unpublished"),
  };
}

export function basicPageLoader() {
  return strapiLoader<BasicPageRecord, Awaited<ReturnType<typeof mapBasicPage>>>({
    name: "strapi-basic-page",
    path: "/api/basic-pages?pLevel=6",
    version: "1",
    fixtures: basicPageFixtures as BasicPageRecord[],
    mapEntry: mapBasicPage,
  });
}
