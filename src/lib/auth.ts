import { betterAuth } from "better-auth";
import { getDatabase, getRuntimeBindings } from "./database";

function readSecret(): string {
  const bindings = getRuntimeBindings();
  const secret = bindings.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters");
  }

  return secret;
}

export function createAuth(request: Request) {
  const bindings = getRuntimeBindings();
  const origin = new URL(request.url).origin;

  return betterAuth({
    appName: "Welink Astro Boilerplate",
    baseURL: origin,
    database: getDatabase(),
    emailAndPassword: {
      enabled: true,
      disableSignUp: bindings.APP_ENV !== "develop",
    },
    secret: readSecret(),
    trustedOrigins: [origin],
    user: {
      additionalFields: {
        role: {
          type: ["user", "admin"],
          required: false,
          defaultValue: "user",
          input: false,
        },
      },
    },
  });
}

export async function getAuthSession(request: Request) {
  return createAuth(request).api.getSession({ headers: request.headers });
}
