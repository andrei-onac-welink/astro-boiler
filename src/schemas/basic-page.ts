import { z } from "astro/zod";
import { baseEntrySchema, mediaSchema } from "./common";

export const externalBlockSchema = z.looseObject({
  __component: z.string().min(1),
});

const basicPageMetaTagsSchema = z
  .object({
    id: z.number().optional(),
    seo: z
      .object({
        id: z.number().optional(),
        title: z.string().nullable().optional(),
        description: z.string().nullable().optional(),
        image: mediaSchema.nullable().optional(),
      })
      .nullable()
      .optional(),
    openGraph: z.record(z.string(), z.unknown()).nullable().optional(),
    twitterCard: z.record(z.string(), z.unknown()).nullable().optional(),
  })
  .optional();

export const basicPageSchema = baseEntrySchema.extend({
  type: z.literal("basic-page"),
  slug: z.string().min(1),
  content: z.string().optional(),
  blocks: z.array(externalBlockSchema).default([]),
  metaTags: basicPageMetaTagsSchema,
  configType: z.string().min(1),
  layout: z.string().min(1),
});

export type BasicPage = z.infer<typeof basicPageSchema>;
