import type { EventPhaseDto, EventSummaryDto } from "@/lib/api/types";

/* Constants and DTO mappers shared by the admin and event services. */

/** `AwardCategory.kind` for categories where members vote for a person of the event; 0 votes for a nomination. */
export const KindUserVote = 1;

export function toPhaseDto(phase: { id: string; type: string; isActive: boolean }): EventPhaseDto {
  return {
    id: phase.id,
    type: phase.type,
    isActive: phase.isActive,
  };
}

export function toEventSummary(event: { id: string; name: string; isActive: boolean }): EventSummaryDto {
  return { id: event.id, name: event.name, isActive: event.isActive };
}
