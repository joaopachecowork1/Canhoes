import { prisma } from "@/lib/prisma";

/* Finding or creating the database user behind a sign-in. */

export type ResolvedUser = {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
  color: string;
};

/**
 * The user with this external id or email, created as a non-admin when there is none. The display
 * name follows the latest sign-in.
 */
export async function resolveUser(
  externalId: string,
  email: string,
  displayName: string | null,
): Promise<ResolvedUser> {
  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ externalId }, { email }],
    },
  });

  if (existing) {
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

/** The development login's user, made admin on the way (only reachable outside production). */
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
