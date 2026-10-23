import { fingerprintPath, strapiQuery } from "./client";
import { strapiLoader } from "./loader";
import type { StrapiRecord } from "./types";

type ResearcherRecord = StrapiRecord & {
  title?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  slug?: string | null;
  bio?: string | null;
  profilePicture?: {
    url: string;
    alternativeText?: string | null;
    provider?: string;
    hash?: string;
    ext?: string;
  } | null;
  publicationsPlus?: Array<{ documentId?: string }>;
  publications?: Array<{ documentId?: string }>;
  metaTags?: Record<string, unknown> | null;
};

export const researcherQuery = strapiQuery("/api/researchers", [
  "fields[0]=displayName",
  "fields[1]=firstName",
  "fields[2]=lastName",
  "fields[3]=bio",
  "fields[4]=slug",
  "fields[5]=publishedAt",
  "fields[6]=updatedAt",
  "populate[publicationsPlus][fields][0]=documentId",
  "populate[publications][fields][0]=documentId",
  "populate[profilePicture][fields][0]=url",
  "populate[profilePicture][fields][1]=alternativeText",
  "populate[profilePicture][fields][2]=provider",
  "populate[profilePicture][fields][3]=hash",
  "populate[profilePicture][fields][4]=ext",
  "populate[metaTags][populate]=*",
]);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-");
}

function mapResearcher(entry: ResearcherRecord) {
  const displayName = entry.displayName || entry.title || [entry.firstName, entry.lastName].filter(Boolean).join(" ");

  if (!displayName) {
    throw new Error(`Researcher ${entry.documentId} has no display name`);
  }

  return {
    id: entry.id,
    documentId: entry.documentId,
    title: displayName,
    type: "researcher" as const,
    slug: entry.slug || slugify(displayName),
    displayName,
    bio: entry.bio ?? undefined,
    profilePicture: entry.profilePicture ?? null,
    publication: (entry.publications ?? [])
      .map((publication) => publication.documentId)
      .filter((id): id is string => Boolean(id)),
    publicationPlus: (entry.publicationsPlus ?? [])
      .map((publicationPlus) => publicationPlus.documentId)
      .filter((id): id is string => Boolean(id)),
    metaTags: entry.metaTags ?? undefined,
    publishedAt: entry.publishedAt,
    updatedAt: entry.updatedAt,
    strapiStatus: entry.strapiStatus ?? (entry.publishedAt ? "published" : "unpublished"),
  };
}

export function researcherLoader() {
  return strapiLoader<ResearcherRecord, ReturnType<typeof mapResearcher>>({
    name: "strapi-researcher",
    path: researcherQuery,
    fingerprintPath: fingerprintPath(researcherQuery, "profilePicture"),
    fingerprintEntry: ({ documentId, profilePicture, publishedAt, updatedAt }) => ({
      documentId,
      profilePictureUrl: profilePicture?.url,
      publishedAt,
      updatedAt,
    }),
    mapEntry: mapResearcher,
  });
}
