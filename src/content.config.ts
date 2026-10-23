import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { basicPageLoader } from "./loaders/strapi/basic-page";
import { basicPageSchema } from "./schemas/basic-page";
import { staticPageSchema } from "./schemas/static-page";

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

export const collections = {
  basicPage,
  staticPage,
};
