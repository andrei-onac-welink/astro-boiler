import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { basicPageLoader } from "@loaders/strapi/basic-page.ts";
import { publicationLoader } from "@loaders/strapi/publication.ts";
import { publicationPlusLoader } from "@loaders/strapi/publication-plus.ts";
import { researcherLoader } from "@loaders/strapi/researcher.ts";
import { basicPageSchema } from "@schemas/basic-page.ts";
import { publicationSchema } from "@schemas/publication.ts";
import { publicationPlusSchema } from "@schemas/publication-plus.ts";
import { researcherSchema } from "@schemas/researcher.ts";
import { staticPageSchema } from "@schemas/static-page.ts";

const staticPage = defineCollection({
  loader: glob({
    base: "./src/content/static-page",
    pattern: "**/*.{md,mdx}",
  }),
  schema: staticPageSchema,
});

const basicPage = defineCollection({
  loader: basicPageLoader(),
  schema: basicPageSchema,
});

const publicationPlus = defineCollection({
  loader: publicationPlusLoader(),
  schema: publicationPlusSchema,
});

const publication = defineCollection({
  loader: publicationLoader(),
  schema: publicationSchema,
});

const researcher = defineCollection({
  loader: researcherLoader(),
  schema: researcherSchema,
});

export const collections = {
  basicPage,
  publication,
  "publication-plus": publicationPlus,
  researcher,
  staticPage,
};
