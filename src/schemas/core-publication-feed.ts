import { z } from "astro/zod";

export const corePublicationFeedEntrySchema = z.object({
  uuid: z.uuid(),
  title: z.string().min(1),
  author: z.string().min(1),
  poster: z.url(),
});

export type CorePublicationFeedEntry = z.infer<typeof corePublicationFeedEntrySchema>;
