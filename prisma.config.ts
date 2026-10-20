// Importa só o tipo: a imagem Docker usa um Prisma CLI global, onde "prisma/config" não resolve.
import type { PrismaConfig } from "prisma/config";

// O Prisma 7 já não lê o .env sozinho. Carrega-o quando existe (desenvolvimento local); no
// Docker e na CI as variáveis vêm do ambiente, que um .env nunca sobrepõe.
try {
  process.loadEnvFile(".env");
} catch {
  // Sem ficheiro .env.
}

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.mjs",
  },
  datasource: {
    // `prisma generate` não precisa de base de dados, por isso um URL em falta só falha nos comandos que ligam.
    url: process.env.DATABASE_URL ?? "",
  },
} satisfies PrismaConfig;
