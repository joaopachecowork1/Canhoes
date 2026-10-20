import { prisma } from "@/lib/prisma";
import type { EventActiveContextDto, EventOverviewDto, EventPermissionsDto } from "@/lib/api/types";
import { toEventSummary, toPhaseDto } from "@/lib/domains/admin/services/constants";
import {
  canSubmitProposals,
  resolveMemberModules,
  type EventRulesState,
  readModuleSwitches,
} from "@/lib/domains/event/rules/eventRules";

/** Os dados de entrada de `eventRules` para um evento, lidos das fases e do `CanhoesEventState`. */
export async function getEventRulesState(eventId: string): Promise<EventRulesState> {
  const [activePhase, state] = await Promise.all([
    prisma.eventPhase.findFirst({ where: { eventId, isActive: true }, select: { type: true } }),
    prisma.canhoesEventState.findUnique({ where: { eventId } }),
  ]);
  return {
    activePhaseType: activePhase?.type ?? null,
    moduleVisibility: readModuleSwitches(state?.moduleVisibilityJson),
    nominationsVisible: state?.nominationsVisible ?? true,
    hasSecretSantaDraw: state?.hasSecretSantaDraw ?? false,
  };
}

/** Indica se o utilizador pertence ao evento. Os direitos de admin vêm de `User.isAdmin`, não da participação. */
export async function isEventMember(eventId: string, userId: string) {
  const member = await prisma.eventMember.findUnique({
    where: { eventId_userId: { eventId, userId } },
    select: { id: true },
  });
  return member !== null;
}

/**
 * O evento como um utilizador o vê: fase ativa, o que pode fazer e que áreas estão abertas
 * nesta fase. `modules` é igual para admins e membros, para a navegação do admin coincidir com
 * a do grupo; os admins continuam a abrir qualquer área (as guardas deixam-nos passar) e
 * chegam às fechadas pela área de admin.
 */
export async function getEventOverview(
  eventId: string,
  userId: string,
  isAdmin: boolean,
): Promise<EventOverviewDto | null> {
  // Evento inexistente: quem chama trata como 404.
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return null;

  const [activePhase, isMember, rules] = await Promise.all([
    prisma.eventPhase.findFirst({ where: { eventId, isActive: true } }),
    isEventMember(eventId, userId),
    getEventRulesState(eventId),
  ]);

  // Admins podem sempre; membros dependem da fase ativa.
  const permissions: EventPermissionsDto = {
    isAdmin,
    canSubmitProposal: isAdmin || (isMember && canSubmitProposals(rules)),
    canVote: isAdmin || (isMember && rules.activePhaseType === "VOTING"),
  };

  return {
    event: toEventSummary(event),
    activePhase: activePhase ? toPhaseDto(activePhase) : null,
    permissions,
    modules: resolveMemberModules(rules),
  };
}

/** O overview do evento ativo (o mais recente se houver vários ativos), ou null quando não há nenhum. */
export async function getActiveEventContext(userId: string, isAdmin: boolean): Promise<EventActiveContextDto | null> {
  const activeEvent = await prisma.event.findFirst({
    where: { isActive: true },
    orderBy: { createdAtUtc: "desc" },
  });
  if (!activeEvent) return null;

  const overview = await getEventOverview(activeEvent.id, userId, isAdmin);
  return overview ? { event: toEventSummary(activeEvent), overview } : null;
}
