import { getServerSession } from "next-auth";

import type { AdminModuleKey } from "@/lib/api/types";
import { HttpError, unauthorized } from "@/lib/api/httpError";
import { authOptions } from "@/lib/domains/auth/services/auth";
import { getEventRulesState, isEventMember } from "@/lib/domains/event/services/event";
import { canSubmitProposals, resolveMemberModules } from "@/lib/domains/event/rules/eventRules";

/** O utilizador da sessão, com o que as guardas precisam de saber. */
export type SessionUser = { id: string; isAdmin: boolean };

/**
 * O utilizador com sessão, ou um 401. O callback `jwt` do NextAuth relê o utilizador da
 * base de dados em cada pedido, por isso `isAdmin` está sempre atual.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw unauthorized();
  }
  return { id: session.user.id, isAdmin: Boolean(session.user.isAdmin) };
}

/** O utilizador com sessão, que tem de ser admin; 401 sem sessão, 403 para membros. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdmin) {
    throw new HttpError(403, "FORBIDDEN", "Admin access required.");
  }
  return user;
}

/** Os admins passam sempre; os restantes têm de ser membros do evento. */
export async function requireEventAccess(eventId: string, user: SessionUser): Promise<void> {
  if (user.isAdmin) return;
  if (!(await isEventMember(eventId, user.id))) {
    throw new HttpError(403, "NOT_A_MEMBER", "You are not a member of this event.");
  }
}

/** Acesso ao evento mais a área estar aberta aos membros na fase atual (ver `eventRules`). */
export async function requireModule(eventId: string, user: SessionUser, module: AdminModuleKey): Promise<void> {
  await requireEventAccess(eventId, user);
  if (user.isAdmin) return;

  // A mesma regra de fase que o overview mostra na UI, aplicada aqui no servidor.
  if (!resolveMemberModules(await getEventRulesState(eventId))[module]) {
    throw new HttpError(403, "MODULE_DISABLED", "Module not available.");
  }
}

/** Acesso ao evento mais as propostas estarem abertas (categorias, nomeações, cromos, medidas). */
export async function requireProposalsOpen(eventId: string, user: SessionUser): Promise<void> {
  await requireEventAccess(eventId, user);
  if (user.isAdmin) return;

  if (!canSubmitProposals(await getEventRulesState(eventId))) {
    throw new HttpError(409, "PROPOSALS_CLOSED", "Proposals are closed in this phase.");
  }
}
