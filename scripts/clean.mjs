import { rm } from "node:fs/promises";

for (const path of ["dist", ".astro", ".wrangler", "coverage", "artifacts"]) {
  await rm(new URL(`../${path}`, import.meta.url), {
    force: true,
    recursive: true,
  });
}
