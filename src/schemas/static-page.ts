import { z } from "astro/zod";

export const staticBlockSchema = z.looseObject({
  component: z.string().min(1),
});

export const staticPageSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  slug: z.string().min(1).optional(),
  blocks: z.array(staticBlockSchema).optional(),
});

export type StaticPage = z.infer<typeof staticPageSchema>;
