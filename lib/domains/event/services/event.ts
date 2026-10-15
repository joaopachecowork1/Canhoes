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
 * The event as one user sees it: active phase, what they may do, and which modules are open
 * in this phase. `modules` is the same for admins and members, so an admin's
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

  const [activePhase, isMember, rules] = await Promise.all([
    prisma.eventPhase.findFirst({ where: { eventId, isActive: true } }),
    isEventMember(eventId, userId),
    getEventRulesState(eventId),
  ]);

  const permissions: EventPermissionsDto = {
    isAdmin,
    isMember,
    canPost: isAdmin || isMember,
    canSubmitProposal: isAdmin || (isMember && canSubmitProposals(rules)),
    canVote: isAdmin || (isMember && rules.activePhaseType === "VOTING"),
    canManage: isAdmin,
  };

  return {
    event: toEventSummary(event),
    activePhase: activePhase ? toPhaseDto(activePhase) : null,
    permissions,
    hasSecretSantaDraw: rules.hasSecretSantaDraw,
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
