import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * The users with these ids (duplicates are fine), by id. The caller runs the query, so it keeps
 * its own `select` and gets exactly that shape back:
 * `loadUsersById(ids, (where) => prisma.user.findMany({ where, select: { id: true, displayName: true } }))`.
 */
export async function loadUsersById<Row extends { id: string }>(
  userIds: Iterable<string>,
  query: (where: Prisma.UserWhereInput) => Promise<Row[]>
) {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return new Map<string, Row>();
  const users = await query({ id: { in: ids } });
  return new Map(users.map((user) => [user.id, user]));
}
