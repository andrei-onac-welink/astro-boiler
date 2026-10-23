import { z } from "astro/zod";

const playerSourceSchema = z.looseObject({
  src: z.string().min(1),
  type: z.string().min(1).optional(),
});

const playerSchema = z.looseObject({
  version: z.literal(3),
  layout: z.string().min(1),
  content: z.looseObject({
    sources: z.array(playerSourceSchema).min(1),
  }),
});

export const corePublicationSchema = z.object({
  publication: z.object({
    uuid: z.uuid(),
    title: z.string().min(1),
    researcher: z.object({
      displayName: z.string().min(1),
      avatarUrl: z.url().nullable(),
      institution: z.string().nullable(),
    }),
    publishedAt: z.string().nullable(),
    license: z.object({
      label: z.string().min(1),
      url: z.url(),
    }),
  }),
  player: playerSchema,
});

export type CorePublication = z.infer<typeof corePublicationSchema>;
