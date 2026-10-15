import { prisma } from "@/lib/prisma";
import type {
  EventActiveContextDto,
  EventOverviewDto,
  EventPermissionsDto,
} from "@/lib/api/types";
import { toEventSummary, toPhaseDto } from "@/lib/domains/admin/services/constants";
import {
  canSubmitProposals,
  resolveMemberModules,
  type EventRulesState,
} from "@/lib/domains/event/services/eventRules";

/** The inputs of `eventRules` for one event, read from its phases and `CanhoesEventState`. */
export async function getEventRulesState(eventId: string): Promise<EventRulesState> {
  const [activePhase, state] = await Promise.all([
    prisma.eventPhase.findFirst({ where: { eventId, isActive: true }, select: { type: true } }),
    prisma.canhoesEventState.findUnique({ where: { eventId } }),
  ]);
  return {
    activePhaseType: activePhase?.type ?? null,
    moduleVisibility: (state?.moduleVisibilityJson ?? {}) as EventRulesState["moduleVisibility"],
    nominationsVisible: state?.nominationsVisible ?? true,
    hasSecretSantaDraw: state?.hasSecretSantaDraw ?? false,
  };
}

/** Whether the user belongs to the event. Admin rights come from `User.isAdmin`, not from membership. */
export async function isEventMember(eventId: string, userId: string) {
  const member = await prisma.eventMember.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { id: true },
  });
  return member !== null;
}

/**
 * The event as one user sees it: active and next phase, what they may do, counters, and which
 * modules are open in this phase. `modules` is the same for admins and members, so an admin's
 * navigation matches the group's; admins still open any module (the gates let them through)
 * and reach the closed ones from the admin area.
 */
export async function getEventOverview(
  eventId: string,
  userId: string,
  isAdmin: boolean
): Promise<EventOverviewDto | null> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return null;

  const [phases, isMember, rules] = await Promise.all([
    prisma.eventPhase.findMany({ where: { eventId }, orderBy: { startDateUtc: "asc" } }),
    isEventMember(eventId, userId),
    getEventRulesState(eventId),
  ]);
  const activePhaseIndex = phases.findIndex((phase) => phase.isActive);
  const activePhase = phases[activePhaseIndex] ?? null;
  const nextPhase = activePhaseIndex >= 0 ? phases[activePhaseIndex + 1] ?? null : null;

  const permissions: EventPermissionsDto = {
    isAdmin,
    isMember,
    canPost: isAdmin || isMember,
    canSubmitProposal: isAdmin || (isMember && canSubmitProposals(rules)),
    canVote: isAdmin || (isMember && rules.activePhaseType === "VOTING"),
    canManage: isAdmin,
  };
  const [memberCount, feedPostCount, pendingProposalCount, wishlistItemCount] = await Promise.all([
    prisma.eventMember.count({ where: { eventId } }),
    prisma.hubPost.count({ where: { eventId } }),
    prisma.categoryProposal.count({ where: { eventId, status: "pending" } }),
    prisma.wishlistItem.count({ where: { eventId, userId } }),
  ]);

  return {
    event: toEventSummary(event),
    activePhase: activePhase ? toPhaseDto(activePhase) : null,
    nextPhase: nextPhase ? toPhaseDto(nextPhase) : null,
    permissions,
    counts: { memberCount, feedPostCount, categoryCount: 0, pendingProposalCount, wishlistItemCount },
    hasSecretSantaDraw: rules.hasSecretSantaDraw,
    hasSecretSantaAssignment: false,
    myWishlistItemCount: wishlistItemCount,
    myProposalCount: 0,
    myVoteCount: 0,
    votingCategoryCount: 0,
    modules: resolveMemberModules(rules),
  };
}

/** The overview of the active event (the most recent one if several are active), or null when none is. */
export async function getActiveEventContext(
  userId: string,
  isAdmin: boolean
): Promise<EventActiveContextDto | null> {
  const activeEvent = await prisma.event.findFirst({
    where: { isActive: true },
    orderBy: { createdAtUtc: "desc" },
  });
  if (!activeEvent) return null;
  const overview = await getEventOverview(activeEvent.id, userId, isAdmin);
  return overview ? { event: toEventSummary(activeEvent), overview } : null;
}
