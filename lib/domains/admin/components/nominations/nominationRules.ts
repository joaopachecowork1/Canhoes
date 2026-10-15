import type { AdminNomineeDto, AwardCategoryDto } from "@/lib/api/types";

export type NominationStatus = "pending" | "approved" | "rejected";
export type NominationListFilter = "all" | NominationStatus;

export const NOMINATION_STATUS_LABELS: Record<NominationListFilter, string> = {
  all: "Todas",
  pending: "Pendentes",
  approved: "Aprovadas",
  rejected: "Rejeitadas",
};

export const NOMINATION_FILTERS = ["all", "pending", "approved", "rejected"] as const;

export const NOMINATION_EMPTY_STATE_LABELS: Record<NominationStatus, string> = {
  pending: "pendentes",
  approved: "aprovadas",
  rejected: "rejeitadas",
};

export const NOMINATION_BADGE_VARIANT_BY_STATUS: Record<
  AdminNomineeDto["status"],
  "default" | "destructive" | "secondary"
> = {
  approved: "default",
  pending: "secondary",
  rejected: "destructive",
};

export function getCategoryName(
  categoryId: string | null | undefined,
  categories: AwardCategoryDto[]
) {
  return categories.find((category) => category.id === categoryId)?.name ?? "Sem categoria";
}

export function countNominationStatuses(nominations: AdminNomineeDto[]) {
  return nominations.reduce(
    (counts, nomination) => {
      if (nomination.status in counts) {
        counts[nomination.status as NominationStatus]++;
      }
      return counts;
    },
    { pending: 0, approved: 0, rejected: 0 } as Record<NominationStatus, number>
  );
}

export function filterAndSortNominations(
  nominations: AdminNomineeDto[],
  statusFilter: NominationListFilter,
  categoryFilter: string
) {
  return [...nominations]
    .filter(
      (nomination) => statusFilter === "all" || nomination.status === statusFilter
    )
    .filter(
      (nomination) => categoryFilter === "all" || nomination.categoryId === categoryFilter
    )
    .sort((left, right) => right.createdAtUtc.localeCompare(left.createdAtUtc));
}
