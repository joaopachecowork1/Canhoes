import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/domains/auth/services/auth";
import { prisma } from "@/lib/prisma";

/** Dados mínimos do utilizador autenticado num pedido. */
export type RequestUser = {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
};

/** O perfil do utilizador com sessão, ou null sem sessão. Nos route handlers usa `requireUser` de `lib/api/guards`. */
export async function getRequestUser(): Promise<RequestUser | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return null;

  // Lê da BD para devolver sempre o estado atual (nome e permissão de admin).

  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, displayName: true, isAdmin: true },
  });
}
