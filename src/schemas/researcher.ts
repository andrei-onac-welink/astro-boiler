import { reference } from "astro:content";
import { z } from "astro/zod";
import { baseEntrySchema, mediaSchema, metaTagsSchema } from "./common";

export const researcherSchema = baseEntrySchema.extend({
  type: z.literal("researcher"),
  slug: z.string().min(1),
  displayName: z.string().min(1),
  bio: z.string().optional(),
  profilePicture: mediaSchema.nullable().optional(),
  publication: z.array(reference("publication")).default([]),
  publicationPlus: z.array(reference("publication-plus")).default([]),
  metaTags: metaTagsSchema,
});

export type Researcher = z.infer<typeof researcherSchema>;
