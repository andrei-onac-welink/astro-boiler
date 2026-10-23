import { z } from "astro/zod";

export const mediaSchema = z.object({
  url: z.url(),
  alternativeText: z.string().nullable().optional(),
  provider: z.string().optional(),
  hash: z.string().optional(),
  ext: z.string().optional(),
});

export const metaTagsSchema = z
  .object({
    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        image: mediaSchema.nullable().optional(),
      })
      .optional(),
    openGraph: z.record(z.string(), z.unknown()).optional(),
    twitterCard: z.record(z.string(), z.unknown()).optional(),
  })
  .optional();

export const baseEntrySchema = z.object({
  id: z.number(),
  documentId: z.string().min(1),
  title: z.string().min(1),
  type: z.string().min(1),
  publishedAt: z.coerce.date().nullable(),
  updatedAt: z.coerce.date(),
  strapiStatus: z.enum(["published", "unpublished"]).default("published"),
});
