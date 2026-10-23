import type { StrapiRecord } from "./types";

export const basicPageFixtures: StrapiRecord[] = [
  {
    id: 1,
    documentId: "basic-page-example",
    title: "Example Basic Page",
    slug: "example-basic-page",
    blocks: [
      {
        __component: "blocks.content",
        content:
          "# Example Basic Page\n\nThis is a simple text-only page loaded through the reusable Strapi content pipeline.",
        published: true,
      },
    ],
    metaTags: {
      seo: {
        title: "Example Basic Page",
        description: "Example text-only CMS-managed Basic Page.",
      },
    },
    config: null,
    publishedAt: "2026-10-01T08:00:00.000Z",
    updatedAt: "2026-10-20T09:30:00.000Z",
  },
];
