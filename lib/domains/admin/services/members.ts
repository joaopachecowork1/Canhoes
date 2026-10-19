import { prisma } from "@/lib/prisma";
import type { PagedResult, PublicUserDto } from "@/lib/api/types";
import { AdminRoleChangeError, assertAdminRoleChangeAllowed } from "./adminRolePolicy";

/* Event members as the admin sees them, and promoting or demoting admins (rules in `adminRolePolicy.ts`). */

/** Members of the event, admins first and then by name. */
export async function getAdminMembersPaged(
  eventId: string,
  skip = 0,
  take = 50
): Promise<PagedResult<PublicUserDto>> {
  const total = await prisma.eventMember.count({ where: { eventId } });

  const members = await prisma.eventMember.findMany({
    where: { eventId },
    orderBy: { role: "desc" },
    skip, take,
  });

  const userIds = [...new Set(members.map((m) => m.userId))];
  const users = userIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, email: true, displayName: true, isAdmin: true, color: true } })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  const items = members
    .map((m) => {
      const u = userMap.get(m.userId);
      return u ? { id: u.id, email: u.email, displayName: u.displayName, isAdmin: u.isAdmin, color: u.color } : null;
    })
    .filter((x): x is PublicUserDto => x !== null)
    .sort((a, b) => {
      const roleCmp = (b.isAdmin ? 1 : 0) - (a.isAdmin ? 1 : 0);
      if (roleCmp !== 0) return roleCmp;
      return (a.displayName ?? a.email).localeCompare(b.displayName ?? b.email);
    });

  return {
    items,
    total, skip, take,
    hasMore: skip + take < total,
  };
}

/**
 * Grants or removes admin rights for a member of the event. Serializable, so two admins demoting
 * each other at the same time cannot leave the portal without an admin.
 */
export async function setAdminRole(input: {
  actorUserId: string;
  eventId: string;
  targetUserId: string;
  isAdmin: boolean;
  confirmSelfDemotion: boolean;
}) {
  return prisma.$transaction(async (tx) => {
    const membership = await tx.eventMember.findUnique({
      where: { eventId_userId: { eventId: input.eventId, userId: input.targetUserId } },
      select: { userId: true },
    });
    if (!membership) throw new AdminRoleChangeError("MEMBER_NOT_FOUND");

    const target = await tx.user.findUnique({
      where: { id: input.targetUserId },
      select: { id: true, isAdmin: true },
    });
    if (!target) throw new AdminRoleChangeError("MEMBER_NOT_FOUND");

    const adminCount = target.isAdmin && !input.isAdmin
      ? await tx.user.count({ where: { isAdmin: true } })
      : 0;
    assertAdminRoleChangeAllowed({
      actorUserId: input.actorUserId,
      targetUserId: input.targetUserId,
      targetIsAdmin: target.isAdmin,
      nextIsAdmin: input.isAdmin,
      adminCount,
      confirmSelfDemotion: input.confirmSelfDemotion,
    });

    return tx.user.update({
      where: { id: input.targetUserId },
      data: { isAdmin: input.isAdmin },
      select: { id: true, isAdmin: true },
    });
  }, { isolationLevel: "Serializable" });
}
