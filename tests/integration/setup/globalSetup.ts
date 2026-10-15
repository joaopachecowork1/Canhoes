import { execFileSync } from "node:child_process";
import type { TestProject } from "vitest/node";

/** Refuses anything but a "*_test" database (every file truncates it), then applies the migrations. */
export default function setup(project: TestProject) {
  const databaseUrl = String(project.config.env.DATABASE_URL ?? "");
  const databaseName = new URL(databaseUrl).pathname.slice(1);
  if (!databaseName.endsWith("_test")) {
    throw new Error(`Integration tests only run against a database named "*_test", got "${databaseName}".`);
  }

  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "inherit",
  });
}
