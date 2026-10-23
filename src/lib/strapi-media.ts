type StrapiMedia = {
  url: string;
  provider?: string;
};

type ResolveStrapiMediaOptions = {
  documentId: string;
  endpoint: string;
  field: string;
  media: StrapiMedia;
  status: "published" | "unpublished";
};

type StrapiMediaRecord = {
  [field: string]: { url?: string } | unknown;
};

type StrapiMediaResponse = {
  data?: StrapiMediaRecord[];
};

const EXPIRY_SAFETY_WINDOW_MS = 60_000;

function readEnvironment(name: string): string | undefined {
  return process.env[name] ?? import.meta.env[name];
}

function signedUrlExpiresAt(value: string): number | undefined {
  const url = new URL(value);
  const signedAt = url.searchParams.get("X-Amz-Date");
  const expiresInSeconds = Number(url.searchParams.get("X-Amz-Expires"));
  const match = signedAt?.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/u);
  if (!match || !Number.isFinite(expiresInSeconds)) return undefined;

  const [, year, month, day, hour, minute, second] = match;
  return (
    Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second)) +
    expiresInSeconds * 1000
  );
}

function needsRefresh(media: StrapiMedia): boolean {
  if (media.provider !== "aws-s3") return false;

  const expiresAt = signedUrlExpiresAt(media.url);
  return !expiresAt || Date.now() >= expiresAt - EXPIRY_SAFETY_WINDOW_MS;
}

export async function resolveStrapiMediaUrl({
  documentId,
  endpoint,
  field,
  media,
  status,
}: ResolveStrapiMediaOptions): Promise<string | undefined> {
  if (!needsRefresh(media)) return media.url;

  const apiUrl = readEnvironment("STRAPI_API_URL");
  const token = readEnvironment("STRAPI_API_TOKEN");
  if (!apiUrl || !token) return undefined;

  const url = new URL(endpoint, apiUrl);
  url.searchParams.set("filters[documentId][$eq]", documentId);
  url.searchParams.set("pagination[pageSize]", "1");
  url.searchParams.set("status", status === "published" ? "published" : "draft");
  ["url", "alternativeText", "provider", "hash", "ext"].forEach((name, index) => {
    url.searchParams.set(`populate[${field}][fields][${index}]`, name);
  });

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) return undefined;

    const payload = (await response.json()) as StrapiMediaResponse;
    const refreshed = payload.data?.[0]?.[field];
    if (!refreshed || typeof refreshed !== "object" || !("url" in refreshed) || typeof refreshed.url !== "string") {
      return undefined;
    }

    return refreshed.url;
  } catch {
    return undefined;
  }
}
