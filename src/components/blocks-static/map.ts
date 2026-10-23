import Heading from "./Heading.astro";

export const staticBlockMap = {
  heading: Heading,
} as const;

export type StaticBlock = {
  component: string;
  [key: string]: unknown;
};
