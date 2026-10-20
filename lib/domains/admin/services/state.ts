import { prisma } from "@/lib/prisma";
import type {
  EventAdminStateDto,
  EventAdminModuleVisibilityDto,
  EventSummaryDto,
  AdminListCountsDto,
  EventAdminBootstrapDto,
} from "@/lib/api/types";
import { readModuleSwitches, resolveMemberModules, type PhaseType } from "@/lib/domains/event/rules/eventRules";
import { CANHOES_MODULES } from "@/lib/modules";

import { CATEGORY_KIND } from "@/lib/categoryKind";

import { toPhaseDto, toEventSummary } from "./constants";

/*
 * The admin's control panel for an event: the active phase, the module switches and the tab
 * counters. What members may do with these settings is decided in `eventRules.ts`.
 */

/** The saved switches with their defaults: everything visible except results, no draw yet. */
function readSwitches(state: { nominationsVisible: boolean; resultsVisible: boolean; hasSecretSantaDraw: boolean; moduleVisibilityJson: unknown } | null) {
  const saved = readModuleSwitches(state?.moduleVisibilityJson);
  return {
    nominationsVisible: state?.nominationsVisible ?? true,
    resultsVisible: state?.resultsVisible ?? false,
    hasSecretSantaDraw: state?.hasSecretSantaDraw ?? false,
    // A module never switched off is on.
    moduleVisibility: Object.fromEntries(
      CANHOES_MODULES.map(({ key }) => [key, saved[key] ?? true])
    ) satisfies EventAdminModuleVisibilityDto,
  };
}

/** Phases and switches of one event, plus which modules the members see right now. */
async function getAdminState(eventId: string): Promise<EventAdminStateDto> {
  const [phases, state] = await Promise.all([
    prisma.eventPhase.findMany({ where: { eventId }, orderBy: { startDateUtc: "asc" } }),
    prisma.canhoesEventState.findUnique({ where: { eventId } }),
  ]);
  const activePhase = phases.find((phase) => phase.isActive) ?? null;
  const { hasSecretSantaDraw, ...switches } = readSwitches(state);

  return {
    eventId,
    activePhase: activePhase ? toPhaseDto(activePhase) : null,
    ...switches,
    effectiveModules: resolveMemberModules({
      activePhaseType: activePhase?.type ?? null,
      moduleVisibility: switches.moduleVisibility,
      nominationsVisible: switches.nominationsVisible,
      hasSecretSantaDraw,
    }),
  };
}

/** Saves the admin's switches (nominations, results, modules); fields left out keep their value. */
export async function updateAdminState(
  eventId: string,
  data: { nominationsVisible?: boolean; resultsVisible?: boolean; moduleVisibility?: EventAdminModuleVisibilityDto }
): Promise<EventAdminStateDto> {
  // Prisma leaves `undefined` fields untouched, so a switch left out keeps its value.
  const changes = {
    nominationsVisible: data.nominationsVisible,
    resultsVisible: data.resultsVisible,
    moduleVisibilityJson: data.moduleVisibility,
  };
  await prisma.canhoesEventState.upsert({
    where: { eventId },
    create: {
      eventId,
      phase: "gala",
      nominationsVisible: data.nominationsVisible ?? true,
      resultsVisible: data.resultsVisible ?? false,
      moduleVisibilityJson: data.moduleVisibility,
    },
    update: changes,
  });

  return getAdminState(eventId);
}

/** The older `CanhoesEventState.phase` name of each phase, still kept in sync. */
const LEGACY_PHASE_NAMES: Record<PhaseType, string> = {
  DRAW: "locked",
  PROPOSALS: "nominations",
  VOTING: "voting",
  RESULTS: "gala",
};

/** A phase the admin opens for the first time stays open for a year, so its dates never close voting by surprise. */
const NEW_PHASE_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Makes `phaseType` the event's only active phase, creating it the first time it is opened (an event
 * starts with PROPOSALS only). Nominations are visible exactly during PROPOSALS and results during RESULTS.
 */
export async function updateAdminPhase(eventId: string, phaseType: PhaseType): Promise<EventAdminStateDto> {
  const now = new Date();
  await prisma.$transaction([
    prisma.eventPhase.updateMany({ where: { eventId, type: { not: phaseType } }, data: { isActive: false } }),
    prisma.eventPhase.upsert({
      where: { eventId_type: { eventId, type: phaseType } },
      update: { isActive: true },
      create: {
        eventId,
        type: phaseType,
        startDateUtc: now,
        endDateUtc: new Date(now.getTime() + NEW_PHASE_WINDOW_MS),
        isActive: true,
      },
    }),
  ]);

  const legacyPhase = LEGACY_PHASE_NAMES[phaseType];

  await prisma.canhoesEventState.upsert({
    where: { eventId },
    create: {
      eventId,
      phase: legacyPhase,
      nominationsVisible: phaseType === "PROPOSALS",
      resultsVisible: phaseType === "RESULTS",
    },
    update: {
      phase: legacyPhase,
      nominationsVisible: phaseType === "PROPOSALS",
      resultsVisible: phaseType === "RESULTS",
    },
  });

  return getAdminState(eventId);
}

/** Makes this the one active event (the one members land on); every other event is deactivated. */
export async function activateEvent(eventId: string): Promise<EventSummaryDto | null> {
  const target = await prisma.event.findUnique({ where: { id: eventId } });
  if (!target) return null;

  await prisma.$transaction([
    prisma.event.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.event.update({ where: { id: eventId }, data: { isActive: true } }),
  ]);

  return toEventSummary({ ...target, isActive: true });
}

/** Merges module switches into the saved ones, so a partial update leaves the other modules as they were. */
export async function updateEventModules(
  eventId: string,
  modules: Partial<EventAdminModuleVisibilityDto>
): Promise<void> {
  const currentState = await prisma.canhoesEventState.findUnique({
    where: { eventId },
    select: { moduleVisibilityJson: true },
  });
  const nextModules = { ...readModuleSwitches(currentState?.moduleVisibilityJson), ...modules };

  await prisma.canhoesEventState.upsert({
    where: { eventId },
    create: { eventId, phase: "gala", nominationsVisible: true, resultsVisible: false, moduleVisibilityJson: nextModules },
    update: { moduleVisibilityJson: nextModules },
  });
}

/** Totals for the admin tab badges and the results participation. */
async function getAdminListCounts(eventId: string): Promise<AdminListCountsDto> {
  const [membersTotal, categoriesTotal, officialResultsCategoriesCount] = await Promise.all([
    prisma.eventMember.count({ where: { eventId } }),
    prisma.awardCategory.count({ where: { eventId } }),
    prisma.awardCategory.count({ where: { eventId, kind: CATEGORY_KIND.USER_VOTE } }),
  ]);

  return { membersTotal, categoriesTotal, officialResultsCategoriesCount };
}

/** Everything the admin panel needs on load: all events, this event's state and the list counters. */
export async function getAdminBootstrap(eventId: string): Promise<EventAdminBootstrapDto> {
  const [events, state] = await Promise.all([
    prisma.event.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }] }),
    getAdminState(eventId),
  ]);

  const counts = await getAdminListCounts(eventId);

  return {
    events: events.map(toEventSummary),
    state,
    counts,
  };
}
