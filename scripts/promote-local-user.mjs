import { spawnSync } from "node:child_process";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: npm run db:promote:local -- user@example.com");
  process.exit(1);
}

const escapedEmail = email.replaceAll("'", "''");
const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(
  command,
  [
    "wrangler",
    "d1",
    "execute",
    "DB",
    "--local",
    "--command",
    `UPDATE "user" SET "role" = 'admin' WHERE "email" = '${escapedEmail}'`,
  ],
  { stdio: "inherit" },
);

process.exit(result.status ?? 1);
