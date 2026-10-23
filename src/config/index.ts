export type AppEnvironment = "develop" | "preview" | "staging" | "production";

type SiteConfig = {
  environment: AppEnvironment;
  includeDrafts: boolean;
  isProductionLike: boolean;
  siteName: string;
};

export function normalizeEnvironment(value: string | undefined): AppEnvironment {
  if (value === "production" || value === "staging" || value === "preview") {
    return value;
  }
  return "develop";
}

export const environment = normalizeEnvironment(process.env.APP_ENV ?? import.meta.env.APP_ENV);

export const config: SiteConfig = {
  environment,
  includeDrafts: environment === "develop" || environment === "preview",
  isProductionLike: environment === "production" || environment === "staging",
  siteName: "Welink Astro",
};
