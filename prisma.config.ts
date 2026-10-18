// A type-only import: the Docker image runs a global Prisma CLI, where "prisma/config" does not resolve.
import type { PrismaConfig } from "prisma/config";

// Prisma 7 no longer reads .env by itself. Load it when there is one (local development); in
// Docker and CI the variables come from the environment, which a .env never overrides.
try {
  process.loadEnvFile(".env");
} catch {
  // No .env file.
}

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.mjs",
  },
  datasource: {
    // `prisma generate` needs no database, so a missing URL only fails the commands that connect.
    url: process.env.DATABASE_URL ?? "",
  },
} satisfies PrismaConfig;
