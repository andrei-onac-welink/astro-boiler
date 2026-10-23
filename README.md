# Welink Astro boilerplate

Astro 7 foundation for Welink content sites. It preserves the content-type,
block, helper, and environment concepts used by the Hugo boilerplate while
using typed Astro collections, ordinary TypeScript helpers, and Cloudflare
Workers.

The boilerplate includes:

- persistent Content Layer state in `.astro/`;
- custom Strapi loaders with pagination, draft preference, fingerprints, and
  per-entry digests;
- Wrangler production, staging, and preview environments;
- explicit cache locations for dependencies, content, and processed images.

## Requirements

| Tool           | Version        |
| -------------- | -------------- |
| Node           | `24.19.0`      |
| npm            | `11` or later  |
| Docker         | Current stable |
| Docker Compose | V2             |

## Local setup

```sh
cp .env.example .env
npm install
npm run dev
```

The default setup uses committed fixtures and does not require credentials.
Open <http://localhost:4321/>.

To exercise remote build-time content, set:

```dotenv
USE_CONTENT_FIXTURES=false
STRAPI_API_URL=https://staging.example.test
STRAPI_API_TOKEN=...
STRAPI_MEDIA_HOST=media-staging.example.test
```

Never commit `.env`, `.dev.vars`, tokens, or sanitized copies that still
contain authorization headers.

## Docker and Traefik

Copy `.env.example` to `.env`, set `PROJECT_NAMESPACE`, then run:

```sh
make build
make up
```

The site is available at `https://<PROJECT_NAMESPACE>-astro.localhost` when the
shared Traefik proxy is running.

The development image uses `fixuid` so files created in the bind-mounted
project remain writable on the host. Native Linux users should set `HOST_UID`
and `HOST_GID` in `.env` to the output of `id -u` and `id -g`. macOS and
Windows Docker Desktop users can normally retain the `1000:1000` defaults.
The container keeps `/work/node_modules` in a Docker-managed Linux volume, so
native packages from a macOS or Windows host are never reused inside Linux.

## Commands

| Command                     | Purpose                                                |
| --------------------------- | ------------------------------------------------------ |
| `npm run dev`               | Start Astro development                                |
| `npm run check`             | Validate Astro and TypeScript                          |
| `npm run lint`              | Run JavaScript/TypeScript/Astro and stylesheet linting |
| `npm run build:develop`     | Build using fixtures                                   |
| `npm run build:preview`     | Build the preview Worker                               |
| `npm run cf:dry-run`        | Build and validate the generated Worker bundle         |
| `npm run deploy`            | Build and deploy the development Worker                |
| `npm run deploy:staging`    | Build and deploy the staging Worker                    |
| `npm run deploy:production` | Build and deploy the production Worker                 |
| `npm run validate`          | Run the complete local suite                           |

## Project structure

```text
src/
├── components/
│   ├── blocks/
│   ├── blocks-external/
│   ├── blocks-static/
│   └── misc/
├── config/
├── content/
├── layouts/
├── lib/
├── loaders/
│   └── strapi/
├── pages/
├── schemas/
└── styles/
```

Rules:

- Each content type is a singular Content Collection with a Zod schema.
- Static Pages are repository-owned Markdown or MDX files in
  `src/content/static-page`; frontmatter may select code-owned blocks from
  `src/components/blocks-static`.
- Basic Pages are CMS-owned entries loaded from Strapi. Their dynamic-zone
  components are rendered through `src/components/blocks-external`.
- Static Pages and Basic Pages share root-level URLs. The build fails when two
  entries resolve to the same slug rather than choosing one implicitly.
- `src/loaders/` produces data; it does not decide routes or presentation.
- `src/pages/` owns URLs and chooses layouts.
- Static blocks may compose collections; external blocks match exact Strapi
  machine names.
- Business rules belong in `src/lib/`, not in components.
- Framework islands are not installed by default.

## Environments and deployment

Application configuration uses explicit `APP_ENV` values: `develop`,
`preview`, `staging`, or `production`. Deployment selection uses named
Wrangler environments rather than `CF_PAGES_BRANCH`. This project uses Astro
SSR and must be deployed to Cloudflare Workers, not Cloudflare Pages. The
current Cloudflare adapter does not produce a Pages Functions bundle.

```sh
npm run deploy:preview -- --preview-alias my-branch

npm run deploy:staging
```

Production deployment is intentionally a separate command and should be
protected by the deployment platform's access controls. Worker deployments use
a `*.workers.dev` hostname unless a custom domain is configured; a
`*.pages.dev` project cannot serve this SSR build.

## Cache locations

| Data                  | Path                                |
| --------------------- | ----------------------------------- |
| Content Layer store   | `.astro/`                           |
| Processed image cache | `node_modules/.astro/`              |
| npm download cache    | npm default; `/npm-cache` in Docker |
| Dependencies          | `node_modules/`                     |
