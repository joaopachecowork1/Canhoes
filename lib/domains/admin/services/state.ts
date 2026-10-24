import { prisma } from "@/lib/prisma";
import type {
  EventAdminStateDto,
  EventAdminModuleVisibilityDto,
  EventSummaryDto,
  AdminListCountsDto,
  EventAdminBootstrapDto,
} from "@/lib/api/types";
import {
  phaseSwitches,
  readModuleSwitches,
  resolveMemberModules,
  type PhaseType,
} from "@/lib/domains/event/rules/eventRules";
import { CANHOES_MODULES } from "@/lib/modules";

import { CATEGORY_KIND } from "@/lib/categoryKind";

import { toPhaseDto, toEventSummary } from "./constants";
import { resetSecretSantaDraw } from "./secretSanta";

/*
 * O painel de controlo do admin para um evento: a fase ativa, os interruptores das áreas e os
 * contadores dos separadores. O que os membros podem fazer com estas definições decide-se em `eventRules.ts`.
 */

/** Os interruptores guardados com os seus valores por defeito: tudo visível exceto os resultados, sem sorteio feito. */
function readSwitches(
  state: {
    nominationsVisible: boolean;
    hasSecretSantaDraw: boolean;
    moduleVisibilityJson: unknown;
  } | null,
) {
  const saved = readModuleSwitches(state?.moduleVisibilityJson);
  return {
    nominationsVisible: state?.nominationsVisible ?? true,
    resultsVisible: false,
    hasSecretSantaDraw: state?.hasSecretSantaDraw ?? false,
    // Uma área que nunca foi desligada está ligada.
    moduleVisibility: Object.fromEntries(
      CANHOES_MODULES.map(({ key }) => [key, saved[key] ?? true]),
    ) satisfies EventAdminModuleVisibilityDto,
  };
}

/** Fases e interruptores de um evento, mais as áreas que os membros veem neste momento. */
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

/** Guarda os interruptores do admin (nomeações, resultados, áreas); os campos omitidos mantêm o valor. */
export async function updateAdminState(
  eventId: string,
  data: { nominationsVisible?: boolean; resultsVisible?: boolean; moduleVisibility?: EventAdminModuleVisibilityDto },
): Promise<EventAdminStateDto> {
  // O Prisma deixa os campos `undefined` como estão, por isso um interruptor omitido mantém o valor.
  const changes = {
    nominationsVisible: data.nominationsVisible,
    moduleVisibilityJson: data.moduleVisibility,
  };
  // Upsert: o estado do evento é criado na primeira vez que o admin mexe nos interruptores.
  await prisma.canhoesEventState.upsert({
    where: { eventId },
    create: {
      eventId,
      nominationsVisible: data.nominationsVisible ?? true,
      moduleVisibilityJson: data.moduleVisibility,
    },
    update: changes,
  });

  return getAdminState(eventId);
}

/** Uma fase que o admin abre pela primeira vez fica aberta um ano, para as datas nunca fecharem a votação de surpresa. */
const NEW_PHASE_WINDOW_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Torna `phaseType` a única fase ativa do evento, criando-a na primeira vez que é aberta (um evento
 * começa só com PROPOSALS). As nomeações ficam visíveis exatamente durante PROPOSALS e os resultados durante RESULTS.
 */
export async function updateAdminPhase(eventId: string, phaseType: PhaseType): Promise<EventAdminStateDto> {
  const now = new Date();

  // Na mesma transação: desativar as outras fases e ativar (ou criar) esta.
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

  // Mantém o estado do evento coerente com a fase: o que está visível depende dela.
  const phaseState = phaseSwitches(phaseType);

  await prisma.canhoesEventState.upsert({
    where: { eventId },
    create: { eventId, ...phaseState },
    update: phaseState,
  });

  // Se o admin voltou atrás para a fase de sorteio (DRAW), desfaz o sorteio anterior.
  if (phaseType === "DRAW") {
    await resetSecretSantaDraw(eventId);
  }

  return getAdminState(eventId);
}

/** Torna este o único evento ativo (aquele para onde os membros vão); todos os outros são desativados. */
export async function activateEvent(eventId: string): Promise<EventSummaryDto | null> {
  const target = await prisma.event.findUnique({ where: { id: eventId } });
  if (!target) return null;

  // Desativa todos e ativa este numa só transação, para nunca haver dois ativos nem nenhum.
  await prisma.$transaction([
    prisma.event.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.event.update({ where: { id: eventId }, data: { isActive: true } }),
  ]);

  return toEventSummary({ ...target, isActive: true });
}

/** Junta os interruptores das áreas aos guardados, para uma atualização parcial deixar as outras áreas como estavam. */
export async function updateEventModules(
  eventId: string,
  modules: Partial<EventAdminModuleVisibilityDto>,
): Promise<void> {
  const currentState = await prisma.canhoesEventState.findUnique({
    where: { eventId },
    select: { moduleVisibilityJson: true },
  });

  const nextModules = { ...readModuleSwitches(currentState?.moduleVisibilityJson), ...modules };

  await prisma.canhoesEventState.upsert({
    where: { eventId },
    create: {
      eventId,
      nominationsVisible: true,
      moduleVisibilityJson: nextModules,
    },
    update: { moduleVisibilityJson: nextModules },
  });
}

/** Totais para os indicadores dos separadores de admin e para a participação nos resultados. */
async function getAdminListCounts(eventId: string): Promise<AdminListCountsDto> {
  const [membersTotal, categoriesTotal, officialResultsCategoriesCount] = await Promise.all([
    prisma.eventMember.count({ where: { eventId } }),
    prisma.awardCategory.count({ where: { eventId } }),
    prisma.awardCategory.count({ where: { eventId, kind: CATEGORY_KIND.USER_VOTE } }),
  ]);

  return { membersTotal, categoriesTotal, officialResultsCategoriesCount };
}

/** Tudo o que o painel de admin precisa ao carregar: todos os eventos, o estado deste evento e os contadores das listas. */
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
