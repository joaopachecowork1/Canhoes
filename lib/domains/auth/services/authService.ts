import { prisma } from "@/lib/prisma";

/* Encontrar ou criar o utilizador da base de dados por trás de um login. */

/** O utilizador resolvido para um login. */
export type ResolvedUser = {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  color: string;
};

/**
 * O utilizador com este id externo ou email, criado como não-admin quando não existe. O nome
 * apresentado acompanha o último login.
 */
export async function resolveUser(
  externalId: string,
  email: string,
  displayName: string | null,
): Promise<ResolvedUser> {
  // Procura por id externo ou por email, para ligar contas do mesmo email.
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ externalId }, { email }],
    },
  });

  if (existing) {
    // Atualiza o nome quando o fornecedor devolve um diferente.
    if (displayName && existing.displayName !== displayName) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { displayName },
      });
    }
    return {
      id: existing.id,
      email: existing.email,
      displayName: existing.displayName ?? displayName,
      isAdmin: existing.isAdmin,
      color: existing.color,
    };
  }

  // Utilizador novo: nunca nasce admin.
  const user = await prisma.user.create({
    data: {
      externalId,
      email,
      displayName: displayName ?? email,
      isAdmin: false,
    },
  });

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isAdmin: user.isAdmin,
    color: user.color,
  };
}

/** O utilizador do login de desenvolvimento, promovido a admin se preciso (só acessível fora de produção). */
export async function resolveDevelopmentAdmin(
  externalId: string,
  email: string,
  displayName: string,
): Promise<ResolvedUser> {
  const user = await resolveUser(externalId, email, displayName);
  if (user.isAdmin) return user;

  return prisma.user.update({
    where: { id: user.id },
    data: { isAdmin: true },
    select: { id: true, email: true, displayName: true, isAdmin: true, color: true },
  });
}
