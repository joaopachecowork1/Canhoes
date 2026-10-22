import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * Os utilizadores com estes ids (duplicados não fazem mal), indexados por id. Quem chama executa a query,
 * por isso mantém o seu `select` e recebe exatamente essa forma:
 * `loadUsersById(ids, (where) => prisma.user.findMany({ where, select: { id: true, displayName: true } }))`.
 */
export async function loadUsersById<Row extends { id: string }>(
  userIds: Iterable<string>,
  query: (where: Prisma.UserWhereInput) => Promise<Row[]>,
) {
  // Remove duplicados para fazer uma só query com ids únicos.
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return new Map<string, Row>();
  const users = await query({ id: { in: ids } });
  return new Map(users.map((user) => [user.id, user]));
}

/** Ordena membros colocando admins primeiro e depois por ordem alfabética (nome ou email). */
export function compareMembersByRoleAndName(
  a: { isAdmin: boolean; displayName: string | null; email: string },
  b: { isAdmin: boolean; displayName: string | null; email: string },
): number {
  const roleCmp = (b.isAdmin ? 1 : 0) - (a.isAdmin ? 1 : 0);
  if (roleCmp !== 0) return roleCmp;
  return (a.displayName ?? a.email).localeCompare(b.displayName ?? b.email);
}
