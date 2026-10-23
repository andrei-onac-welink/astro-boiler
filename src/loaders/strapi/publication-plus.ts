import { fingerprintPath, strapiQuery } from "./client";
import { strapiLoader } from "./loader";
import type { StrapiRecord } from "./types";

type PublicationPlusRecord = StrapiRecord & {
  title: string;
  slug?: string | null;
  uuid?: string | null;
  abstract?: string | null;
  videoUrl?: string | null;
  videoDuration?: number | null;
  doi?: string | null;
  ltPublishedDate?: string | null;
  researchers?: Array<{ documentId?: string }>;
  videoCover?: {
    url: string;
    alternativeText?: string | null;
    provider?: string;
    hash?: string;
    ext?: string;
  } | null;
  tags?: Array<{ title?: string }>;
  metaTags?: Record<string, unknown> | null;
};

export const publicationPlusQuery = strapiQuery("/api/publications-plus", [
  "fields[0]=title",
  "fields[1]=slug",
  "fields[2]=videoUrl",
  "fields[3]=videoDuration",
  "fields[4]=doi",
  "fields[5]=ltPublishedDate",
  "fields[6]=publishedAt",
  "fields[7]=updatedAt",
  "fields[8]=uuid",
  "populate[researchers][fields][0]=documentId",
  "populate[tags][fields][0]=title",
  "populate[videoCover][fields][0]=url",
  "populate[videoCover][fields][1]=alternativeText",
  "populate[videoCover][fields][2]=provider",
  "populate[videoCover][fields][3]=hash",
  "populate[videoCover][fields][4]=ext",
]);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-");
}

function mapPublicationPlus(entry: PublicationPlusRecord) {
  const researcherId = entry.researchers?.[0]?.documentId;
  if (!researcherId) {
    throw new Error(`Publication Plus ${entry.documentId} has no researcher documentId`);
  }

  return {
    id: entry.id,
    documentId: entry.documentId,
    title: entry.title,
    type: "publication-plus" as const,
    slug: entry.slug || slugify(entry.title),
    uuid: entry.uuid || undefined,
    abstract: entry.abstract ?? undefined,
    videoUrl: entry.videoUrl ?? undefined,
    videoDuration: entry.videoDuration ?? undefined,
    doi: entry.doi ?? undefined,
    ltPublishedDate: entry.ltPublishedDate ?? null,
    researcher: researcherId,
    videoCover: entry.videoCover ?? null,
    tags: (entry.tags ?? []).map((tag) => tag.title).filter((title): title is string => Boolean(title)),
    metaTags: entry.metaTags ?? undefined,
    publishedAt: entry.publishedAt,
    updatedAt: entry.updatedAt,
    strapiStatus: entry.strapiStatus ?? (entry.publishedAt ? "published" : "unpublished"),
  };
}

export function publicationPlusLoader() {
  return strapiLoader<PublicationPlusRecord, ReturnType<typeof mapPublicationPlus>>({
    name: "strapi-publication-plus",
    path: publicationPlusQuery,
    fingerprintPath: fingerprintPath(publicationPlusQuery, "videoCover"),
    fingerprintEntry: ({ documentId, publishedAt, updatedAt, videoCover }) => ({
      documentId,
      publishedAt,
      updatedAt,
      videoCoverUrl: videoCover?.url,
    }),
    mapEntry: mapPublicationPlus,
  });
}
