import { reference } from "astro:content";
import { z } from "astro/zod";
import { baseEntrySchema, mediaSchema, metaTagsSchema } from "./common";

export const publicationPlusSchema = baseEntrySchema.extend({
  type: z.literal("publication-plus"),
  slug: z.string().min(1),
  uuid: z.string().min(1).optional(),
  abstract: z.string().optional(),
  videoUrl: z.url().optional(),
  videoDuration: z.number().nonnegative().optional(),
  doi: z.string().optional(),
  ltPublishedDate: z.coerce.date().nullable().optional(),
  researcher: reference("researcher"),
  videoCover: mediaSchema.nullable().optional(),
  tags: z.array(z.string()).default([]),
  metaTags: metaTagsSchema,
});

export type PublicationPlus = z.infer<typeof publicationPlusSchema>;
