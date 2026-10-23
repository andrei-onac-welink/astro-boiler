import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { loadEnv } from "vite";

const environment = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const site = process.env.SITE_URL || "http://localhost:4321";
const strapiMediaHost = environment.STRAPI_MEDIA_HOST;
const devProxy = process.env.DEV_PROXY === "1";

export default defineConfig({
  site,
  output: "server",
  trailingSlash: "always",
  adapter: cloudflare({
    imageService: {
      build: "compile",
      runtime: "passthrough",
    },
  }),
  integrations: [sitemap()],
  image: {
    domains: strapiMediaHost ? [strapiMediaHost] : [],
  },
  vite: {
    server: {
      host: devProxy ? "0.0.0.0" : "localhost",
      allowedHosts: [".localhost"],
      ws: devProxy ? { protocol: "wss", clientPort: 443 } : undefined,
    },
  },
});
