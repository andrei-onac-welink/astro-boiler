import cloudflare from "@astrojs/cloudflare";
import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";

const site = process.env.SITE_URL || "http://localhost:4321";
const devProxy = process.env.DEV_PROXY === "1";

export default defineConfig({
  site,
  output: "server",
  session: false,
  trailingSlash: "always",
  adapter: cloudflare({
    imageService: {
      build: "compile",
      runtime: "passthrough",
    },
  }),
  image: {
    remotePatterns: [{ protocol: "https" }, { protocol: "http", hostname: "s3.localhost" }],
  },
  integrations: [sitemap()],
  vite: {
    server: {
      host: devProxy ? "0.0.0.0" : "localhost",
      allowedHosts: [".localhost"],
      ws: devProxy ? { protocol: "wss", clientPort: 443 } : undefined,
    },
  },
});
