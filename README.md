# Welink Astro boilerplate

Astro 7 foundation for Welink content sites. It preserves the content-type,
block, helper, and environment concepts used by the Hugo boilerplate while
using typed Astro collections, ordinary TypeScript helpers, and Cloudflare
Workers.

The boilerplate includes:

- persistent Content Layer state in `.astro/`;
- custom Strapi loaders with pagination, draft preference, fingerprints, and
  per-entry digests;
- example Basic Page, Researcher, Publication, and Publication Plus collections;
- local Cloudflare D1 authentication and separate per-user Publication and Publication Plus favorites;
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
cp .dev.vars.example .dev.vars
npm install
npm run db:migrate:local
npm run dev
```

Set `STRAPI_API_URL` and `STRAPI_API_TOKEN` in `.env`, then open
<http://localhost:4321/>. The content loaders always use Strapi and fail with a
clear error when `STRAPI_API_URL` or `STRAPI_API_TOKEN` is missing.

Set `CORE_API_URL` and `CORE_API_TOKEN` in `.dev.vars` to enable the request-time
fallback for simple publications. Prerendered Strapi publication pages continue
to win. A request to `/publication/<LT Work UUID>/` that has no matching Strapi
page is loaded from LT Core, cached for five minutes, and rendered with the LT
player. Publication Plus remains Strapi-only.

Create a local test account at <http://localhost:4321/register/>. Public
registration is disabled outside the `develop` environment. To promote a local
account to the admin role, run:

```sh
npm run db:promote:local -- user@example.com
```

Promoted users can open the protected `/admin/` route. Normal authenticated
users receive `403 Forbidden`.

Wrangler stores the local D1 database under `.wrangler/state/`. This local
database is isolated from Cloudflare and is ignored by Git.

Configure build-time content with:

```dotenv
STRAPI_API_URL=https://staging.example.test
STRAPI_API_TOKEN=...
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
| `npm run build:develop`     | Build for local development using Strapi               |
| `npm run build:preview`     | Build the preview Worker                               |
| `npm run db:migrate:local`  | Apply migrations to the local D1 database              |
| `npm run db:promote:local`  | Promote a local account to the admin role              |
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

## Authentication and favorites

Better Auth stores users, credential accounts, and sessions in the D1 `DB`
binding. D1 also stores Publication and Publication Plus favorites by their
stable Strapi `documentId` values; content remains owned by Strapi and is not
copied into D1.

The repository configures only a local D1 binding. Before deploying
authentication, create a separate D1 database for preview, staging, and
production, then add a `DB` binding inside each matching Wrangler environment.
Set `BETTER_AUTH_SECRET` as a Wrangler secret. The authentication base URL is
derived from each incoming request. Never reuse the local development secret.

## LT Core publication fallback

The publication fallback uses runtime Worker configuration, not build-time
Strapi configuration:

| Name             | Type             | Purpose                                  |
| ---------------- | ---------------- | ---------------------------------------- |
| `CORE_API_URL`   | Runtime variable | LT Core API base, including `/api/v1`    |
| `CORE_API_TOKEN` | Runtime secret   | Dedicated server-to-server website token |

Configure both values for every Worker environment and Preview that should
serve Core-only publications. The token must never be exposed to client code or
stored as a plain-text build variable. The fallback accepts only LT Work UUIDs,
passes the token in the `Authorization` header, times out after five seconds,
returns `404` for unknown or unavailable publications, and returns `503` when
Core or its response contract is unavailable.

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
