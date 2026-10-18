import { getServerSession } from "next-auth";

import type { AdminModuleKey } from "@/lib/api/types";
import { HttpError, unauthorized } from "@/lib/api/httpError";
import { authOptions } from "@/lib/domains/auth/services/auth";
import { getEventRulesState, isEventMember } from "@/lib/domains/event/services/event";
import { canSubmitProposals, resolveMemberModules } from "@/lib/domains/event/rules/eventRules";

export type SessionUser = { id: string; isAdmin: boolean };

/**
 * The signed-in user, or a 401. The NextAuth `jwt` callback re-reads the user from the
 * database on every request, so `isAdmin` is always current.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw unauthorized();
  }
  return { id: session.user.id, isAdmin: Boolean(session.user.isAdmin) };
}

/** The signed-in user, who must be an admin; 401 without a session, 403 for members. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdmin) {
    throw new HttpError(403, "FORBIDDEN", "Admin access required.");
  }
  return user;
}

/** Admins always pass; everyone else has to be a member of the event. */
export async function requireEventAccess(eventId: string, user: SessionUser): Promise<void> {
  if (user.isAdmin) return;
  if (!(await isEventMember(eventId, user.id))) {
    throw new HttpError(403, "NOT_A_MEMBER", "You are not a member of this event.");
  }
}

/** Event access plus the module being open for members in the current phase (see `eventRules`). */
export async function requireModule(eventId: string, user: SessionUser, module: AdminModuleKey): Promise<void> {
  await requireEventAccess(eventId, user);
  if (user.isAdmin) return;
  if (!resolveMemberModules(await getEventRulesState(eventId))[module]) {
    throw new HttpError(403, "MODULE_DISABLED", "Module not available.");
  }
}

/** Event access plus proposals being open (category proposals, nominations, stickers, measures). */
export async function requireProposalsOpen(eventId: string, user: SessionUser): Promise<void> {
  await requireEventAccess(eventId, user);
  if (user.isAdmin) return;
  if (!canSubmitProposals(await getEventRulesState(eventId))) {
    throw new HttpError(409, "PROPOSALS_CLOSED", "Proposals are closed in this phase.");
  }
}
