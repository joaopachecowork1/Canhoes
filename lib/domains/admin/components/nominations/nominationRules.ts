import type { AdminNomineeDto, AwardCategoryDto } from "@/lib/api/types";
import messages from "@/messages/pt.json";

export function getCategoryName(categoryId: string | null | undefined, categories: AwardCategoryDto[]) {
  return (
    categories.find((category) => category.id === categoryId)?.name ?? messages.admin.AdminNominationsView.noCategory
  );
}

export function filterAndSortNominations(nominations: AdminNomineeDto[], categoryFilter: string) {
  return [...nominations]
    .filter((nomination) => categoryFilter === "all" || nomination.categoryId === categoryFilter)
    .sort((left, right) => right.createdAtUtc.localeCompare(left.createdAtUtc));
}
