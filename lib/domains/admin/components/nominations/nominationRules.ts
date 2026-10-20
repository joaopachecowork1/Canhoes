import type { AdminNomineeDto, AwardCategoryDto } from "@/lib/api/types";
import messages from "@/messages/pt.json";

/** Nome da categoria pelo id, ou o texto de "sem categoria" quando não existe. */
export function getCategoryName(categoryId: string | null | undefined, categories: AwardCategoryDto[]) {
  return (
    categories.find((category) => category.id === categoryId)?.name ?? messages.admin.AdminNominationsView.noCategory
  );
}

/** Filtra as nomeações por categoria (`all` = todas) e ordena da mais recente para a mais antiga. */
export function filterAndSortNominations(nominations: AdminNomineeDto[], categoryFilter: string) {
  return [...nominations]
    .filter((nomination) => categoryFilter === "all" || nomination.categoryId === categoryFilter)
    .sort((left, right) => right.createdAtUtc.localeCompare(left.createdAtUtc));
}
