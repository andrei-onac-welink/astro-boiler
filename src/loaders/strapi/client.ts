import type { StrapiRecord, StrapiResponse, StrapiStatus } from "./types";

export type FetchCollectionOptions = {
  apiUrl: string;
  path: string;
  token?: string;
  includeDrafts: boolean;
  fetcher?: typeof fetch;
};

function authorizationHeaders(token?: string): HeadersInit {
  return token
    ? {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      }
    : { Accept: "application/json" };
}

export function withQuery(path: string, values: Record<string, string | number>): string {
  const url = new URL(path, "https://query.invalid");
  for (const [key, value] of Object.entries(values)) {
    url.searchParams.set(key, String(value));
  }
  return `${url.pathname}${url.search}`;
}

export function strapiQuery(path: string, parameters: string[]): string {
  const url = new URL(path, "https://query.invalid");
  for (const parameter of parameters) {
    const separator = parameter.indexOf("=");
    if (separator === -1) {
      throw new Error(`Invalid Strapi query parameter: ${parameter}`);
    }
    url.searchParams.append(parameter.slice(0, separator), parameter.slice(separator + 1));
  }
  return `${url.pathname}${url.search}`;
}

export async function digest(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const result = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(result))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function deduplicateByDocumentId<T extends StrapiRecord>(entries: T[]): T[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = entry.documentId || String(entry.id);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function fetchStatus<T extends StrapiRecord>(
  options: FetchCollectionOptions,
  status: "draft" | "published",
): Promise<T[]> {
  const fetcher = options.fetcher ?? fetch;
  const results: T[] = [];
  let page = 1;

  while (true) {
    const path = withQuery(options.path, {
      "pagination[page]": page,
      "pagination[pageSize]": 100,
      status,
    });
    const url = new URL(path, options.apiUrl);
    const response = await fetcher(url, {
      headers: authorizationHeaders(options.token),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      throw new Error(`Strapi request failed (${response.status}) for ${url.pathname}${detail ? `: ${detail}` : ""}`);
    }

    const payload = (await response.json()) as StrapiResponse<T>;
    const strapiStatus: StrapiStatus = status === "draft" ? "unpublished" : "published";

    results.push(
      ...payload.data.map((entry) => ({
        ...entry,
        strapiStatus,
      })),
    );

    const pageCount = payload.meta?.pagination?.pageCount ?? 1;
    if (page >= pageCount) {
      break;
    }
    page += 1;
  }

  return results;
}

export async function fetchAll<T extends StrapiRecord>(options: FetchCollectionOptions): Promise<T[]> {
  const statuses = options.includeDrafts ? (["draft", "published"] as const) : (["published"] as const);
  const batches: T[][] = [];

  for (const status of statuses) {
    batches.push(await fetchStatus<T>(options, status));
  }

  return deduplicateByDocumentId(batches.flat());
}

export function fingerprintPath(endpoint: string, mediaField?: string): string {
  const url = new URL(endpoint, "https://query.invalid");
  url.search = "";
  url.searchParams.set("fields[0]", "documentId");
  url.searchParams.set("fields[1]", "updatedAt");
  url.searchParams.set("fields[2]", "publishedAt");
  if (mediaField) {
    url.searchParams.set(`populate[${mediaField}][fields][0]`, "url");
  }
  url.searchParams.set("sort[0]", "documentId:asc");
  return `${url.pathname}${url.search}`;
}
