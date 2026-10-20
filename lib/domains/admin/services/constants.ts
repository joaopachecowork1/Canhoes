import type { EventPhaseDto, EventSummaryDto } from "@/lib/api/types";

/* Conversores para DTO partilhados pelos serviços de admin e de evento. */

/** A forma de uma fase do evento na API. */
export function toPhaseDto(phase: { id: string; type: string; isActive: boolean }): EventPhaseDto {
  return {
    id: phase.id,
    type: phase.type,
    isActive: phase.isActive,
  };
}

/** A forma de um evento nas listas da API: id, nome e se é o ativo. */
export function toEventSummary(event: { id: string; name: string; isActive: boolean }): EventSummaryDto {
  return { id: event.id, name: event.name, isActive: event.isActive };
}
