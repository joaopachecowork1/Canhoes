import { execFileSync } from "node:child_process";
import type { TestProject } from "vitest/node";

/** Refuses anything but a "*_test" database (every file truncates it), then applies the migrations. */
export default function setup(project: TestProject) {
  const databaseUrl = String(project.config.env.DATABASE_URL ?? "");
  const databaseName = new URL(databaseUrl).pathname.slice(1);
  if (!databaseName.endsWith("_test")) {
    throw new Error(`Integration tests only run against a database named "*_test", got "${databaseName}".`);
  }

  // prisma.config.ts prefere DATABASE_URL_UNPOOLED (do .env, p. ex. o Neon de produção): sobrepõe-se também aqui.
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: databaseUrl, DATABASE_URL_UNPOOLED: databaseUrl },
    stdio: "inherit",
  });
}
