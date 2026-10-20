import { prisma } from "@/lib/prisma";
import type { PersonColor } from "@/lib/personColors";
import type { PublicUserDto } from "@/lib/api/types";
import { loadUsersById } from "@/lib/usersById";

/* Quem está no evento e a cor do próprio membro. As guardas das rotas decidem quem pode chamar cada função. */

/** Membros do evento, primeiro os admins e depois por nome. Aqui `isAdmin` é o papel no evento, não a flag da conta. */
export async function getMembers(eventId: string): Promise<PublicUserDto[]> {
  const members = await prisma.eventMember.findMany({
    where: { eventId },
    orderBy: { role: "desc" },
  });

  // Carrega os utilizadores de uma só vez em vez de um por membro.
  const userMap = await loadUsersById(
    members.map((m) => m.userId),
    (where) =>
      prisma.user.findMany({ where, select: { id: true, email: true, displayName: true, isAdmin: true, color: true } }),
  );

  // Junta membro e utilizador (ignorando membros sem utilizador) e ordena: admins primeiro, depois por nome ou email.
  const result = members
    .map((m) => {
      const u = userMap.get(m.userId);
      return u
        ? { id: u.id, email: u.email, displayName: u.displayName, isAdmin: m.role === "admin", color: u.color }
        : null;
    })
    .filter((x): x is PublicUserDto => x !== null)
    .sort((a, b) => {
      const roleCmp = (b.isAdmin ? 1 : 0) - (a.isAdmin ? 1 : 0);
      if (roleCmp !== 0) return roleCmp;
      return (a.displayName ?? a.email).localeCompare(b.displayName ?? b.email);
    });

  return result;
}

/** Muda a cor do membro com sessão para outra chave da paleta. */
export async function setUserColor(userId: string, color: PersonColor): Promise<{ color: string }> {
  return prisma.user.update({ where: { id: userId }, data: { color }, select: { color: true } });
}
