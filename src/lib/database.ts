import { env } from "cloudflare:workers";

type RuntimeBindings = Cloudflare.Env & {
  BETTER_AUTH_SECRET?: string;
};

export function getRuntimeBindings(): RuntimeBindings {
  return env as RuntimeBindings;
}

export function getDatabase(): D1Database {
  const database = getRuntimeBindings().DB;
  if (!database) {
    throw new Error("The DB binding is not configured for this environment");
  }

  return database;
}
