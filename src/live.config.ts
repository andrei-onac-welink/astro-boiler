import { defineLiveCollection } from "astro:content";
import { corePublicationFeedLoader } from "@loaders/live/core-publication-feed.ts";
import { corePublicationLoader } from "@loaders/live/core-publication.ts";
import { corePublicationFeedEntrySchema } from "@schemas/core-publication-feed.ts";
import { corePublicationSchema } from "@schemas/core-publication.ts";

const corePublication = defineLiveCollection({
  loader: corePublicationLoader(),
  schema: corePublicationSchema,
});

const corePublicationFeed = defineLiveCollection({
  loader: corePublicationFeedLoader(),
  schema: corePublicationFeedEntrySchema,
});

export const collections = {
  "core-publication": corePublication,
  "core-publication-feed": corePublicationFeed,
};
