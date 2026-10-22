import { prisma } from "@/lib/prisma";
import type { PagedResult, PublicUserDto } from "@/lib/api/types";
import { AdminRoleChangeError, assertAdminRoleChangeAllowed } from "./adminRolePolicy";
import { compareMembersByRoleAndName, loadUsersById } from "@/lib/usersById";

/* Os membros do evento como o admin os vê, e a promoção ou despromoção de admins (regras em `adminRolePolicy.ts`). */

/** Membros do evento, primeiro os admins e depois por nome. */
export async function getAdminMembersPaged(eventId: string, skip = 0, take = 50): Promise<PagedResult<PublicUserDto>> {
  const total = await prisma.eventMember.count({ where: { eventId } });

  const members = await prisma.eventMember.findMany({
    where: { eventId },
    orderBy: { role: "desc" },
    skip,
    take,
  });

  // Carrega os utilizadores de uma só vez.
  const userMap = await loadUsersById(
    members.map((m) => m.userId),
    (where) =>
      prisma.user.findMany({ where, select: { id: true, email: true, displayName: true, isAdmin: true, color: true } }),
  );

  // Junta membro e utilizador e ordena: admins primeiro, depois por nome ou email.
  const items = members
    .map((m) => {
      const u = userMap.get(m.userId);
      return u ? { id: u.id, email: u.email, displayName: u.displayName, isAdmin: u.isAdmin, color: u.color } : null;
    })
    .filter((x): x is PublicUserDto => x !== null)
    .sort(compareMembersByRoleAndName);

  return {
    items,
    total,
    skip,
    take,
    hasMore: skip + take < total,
  };
}

/**
 * Dá ou retira direitos de admin a um membro do evento. É Serializable, para que dois admins a
 * despromoverem-se um ao outro ao mesmo tempo não deixem o portal sem admin.
 */
export async function setAdminRole(input: {
  actorUserId: string;
  eventId: string;
  targetUserId: string;
  isAdmin: boolean;
  confirmSelfDemotion: boolean;
}) {
  return prisma.$transaction(
    async (tx) => {
      // O alvo tem de pertencer ao evento e existir.
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

      // Só conta os admins quando é uma despromoção; depois aplica a política.
      const adminCount = target.isAdmin && !input.isAdmin ? await tx.user.count({ where: { isAdmin: true } }) : 0;
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
    },
    { isolationLevel: "Serializable" },
  );
}
