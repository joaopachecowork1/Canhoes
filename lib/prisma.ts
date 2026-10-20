// Qualquer bundle de cliente que chegue ao Prisma (direta ou indiretamente por um serviço) faz o build falhar.
import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/lib/generated/prisma/client";

// Guarda o cliente no `globalThis` para o hot reload do dev não abrir uma nova ligação a cada recarga.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // O Prisma 7 liga-se através do driver pg; o pool lê o mesmo DATABASE_URL de sempre.
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({ adapter });
}

/** Cliente Prisma partilhado por todo o servidor. */
export const prisma = globalForPrisma.prisma ?? createPrismaClient();

// Em produção cada processo cria o seu próprio cliente, não é preciso guardá-lo.
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
