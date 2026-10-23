import Content from "./Content.astro";
import HeroBanner from "./HeroBanner.astro";

export const blockMap = {
  "blocks.content": Content,
  "blocks.hero-banner": HeroBanner,
} as const;

export type ExternalBlock =
  | {
      __component: "blocks.hero-banner";
      heading: string;
      summary?: string;
    }
  | {
      __component: "blocks.content";
      content: string;
      contentHtml?: string;
      published?: boolean;
    }
  | {
      __component: string;
      [key: string]: unknown;
    };
