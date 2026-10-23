import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/domains/auth/services/auth";
import { isDatabaseUserId } from "@/lib/domains/auth/services/userIdentity";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

/** Dados mínimos do utilizador autenticado num pedido. */
export type RequestUser = {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
};

/** Procura utilizador na base de dados por ID (UUID) ou por email. */
async function findUserForSession(userId?: string, email?: string): Promise<RequestUser | null> {
  try {
    if (userId && isDatabaseUserId(userId)) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, displayName: true, isAdmin: true },
      });
      if (user) return user;
    }

    if (email) {
      return await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true, displayName: true, isAdmin: true },
      });
    }

    return null;
  } catch (error) {
    logger.error("Error finding user for session:", error);
    return null;
  }
}

/** O perfil do utilizador com sessão, ou null sem sessão. Nos route handlers usa `requireUser` de `lib/api/guards`. */
export async function getRequestUser(): Promise<RequestUser | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const email = session?.user?.email?.toLowerCase();
  if (!userId && !email) return null;

  return findUserForSession(userId, email);
}
