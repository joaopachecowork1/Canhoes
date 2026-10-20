"use client";

import { useState } from "react";
import { BarChart2 } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { AdminCategoryResultDto } from "@/lib/api/types";
import { adminRepo } from "@/lib/repositories/adminRepo";
import { useIsAdmin } from "@/components/providers/AuthContext";
import { formatMessage } from "@/lib/messages";
import { AdminStateMessage } from "@/lib/domains/admin/components/layout/AdminStateMessage";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import messages from "@/messages/pt.json";

import { ADMIN_CONTENT_CARD_CLASS, AdminSelectableButton } from "./adminContentUi";
import { ResultsCategoryDrawer } from "./ResultsCategoryDrawer";
import { queryKeys } from "@/lib/queryKeys";

const copy = messages.admin.AdminOfficialResultsSection;
const EMPTY_ADMIN_CATEGORY_RESULTS: AdminCategoryResultDto[] = [];

/** Botão de uma categoria na lista de resultados, com o total de votos e a participação. */
function ResultsCategoryButton({
  category,
  isSelected,
  totalMembers,
  onSelect,
}: Readonly<{
  category: AdminCategoryResultDto;
  isSelected: boolean;
  totalMembers: number;
  onSelect: (categoryId: string) => void;
}>) {
  const participationRate = Math.round(category.participationRate * 100);

  return (
    <AdminSelectableButton
      type="button"
      onClick={() => onSelect(category.categoryId)}
      selected={isSelected}
      aria-pressed={isSelected}
    >
      <p className="truncate text-base font-semibold text-[var(--ink-primary)]">{category.categoryName}</p>
      <p className="mt-1 text-xs text-[var(--ink-secondary)]">
        {formatMessage(copy.categoryVotes, {
          votes: category.totalVotes,
          members: totalMembers,
          percent: participationRate,
        })}
      </p>
    </AdminSelectableButton>
  );
}

/** Cabeçalho da secção, com a hora da última atualização quando existe. */
function ResultsHeader({ refreshedAt }: Readonly<{ refreshedAt: string | null }>) {
  return (
    <Card className={ADMIN_CONTENT_CARD_CLASS}>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2">
          <BarChart2 className="h-4 w-4" />
          {copy.title}
        </CardTitle>
        {refreshedAt ? (
          <p className="text-xs text-[var(--ink-secondary)]">{formatMessage(copy.updatedAt, { date: refreshedAt })}</p>
        ) : null}
      </CardHeader>
    </Card>
  );
}

/** Carrega os resultados oficiais por categoria; só corre para admins com um evento ativo. */
function useOfficialResults(eventId: string | null, isAdmin: boolean) {
  const queryEventId = eventId ?? "";
  return useQuery<AdminCategoryResultDto[]>({
    queryKey: queryKeys.admin.officialResults(queryEventId),
    enabled: Boolean(eventId) && isAdmin,
    queryFn: async () => (await adminRepo.getOfficialResultsPaged(queryEventId)).items,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
  });
}

/** Secção do admin com os resultados oficiais: lista de categorias e gaveta de detalhe da escolhida. */
export function AdminOfficialResultsSection({
  eventId,
  memberCount,
}: Readonly<{
  eventId: string | null;
  memberCount: number;
}>) {
  const isAdmin = useIsAdmin();

  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const resultsQuery = useOfficialResults(eventId, isAdmin);
  const resultCategories = resultsQuery.data ?? EMPTY_ADMIN_CATEGORY_RESULTS;
  // a categoria escolhida deriva do id, para refletir sempre os dados mais recentes
  const selectedCategory = resultCategories.find((category) => category.categoryId === selectedCategoryId) ?? null;

  if (!isAdmin) return <AdminStateMessage tone="warning">{copy.adminsOnly}</AdminStateMessage>;
  if (!eventId) return <AdminStateMessage>{copy.noEvent}</AdminStateMessage>;
  if (resultsQuery.isLoading) return <AdminStateMessage>{copy.loading}</AdminStateMessage>;

  if (resultsQuery.error) {
    return (
      <AdminStateMessage
        tone="warning"
        action={<Button onClick={() => void resultsQuery.refetch()}>{messages.common.retry}</Button>}
      >
        {copy.loadError}
      </AdminStateMessage>
    );
  }

  return (
    <div className="space-y-4">
      <ResultsHeader
        refreshedAt={resultsQuery.dataUpdatedAt ? new Date(resultsQuery.dataUpdatedAt).toLocaleString("pt-PT") : null}
      />

      {resultCategories.length === 0 ? <AdminStateMessage variant="panel">{copy.empty}</AdminStateMessage> : null}

      {resultCategories.length > 0 ? (
        <div className="max-h-[58svh] overflow-y-auto rounded-[var(--radius-md-token)] border border-[var(--border-paper)] bg-[var(--bg-paper-soft)] p-2">
          <div className="space-y-2">
            {resultCategories.map((category) => (
              <ResultsCategoryButton
                key={category.categoryId}
                category={category}
                isSelected={category.categoryId === selectedCategoryId}
                totalMembers={memberCount}
                onSelect={setSelectedCategoryId}
              />
            ))}
          </div>
        </div>
      ) : null}

      <ResultsCategoryDrawer
        category={selectedCategory}
        memberCount={memberCount}
        onClose={() => setSelectedCategoryId(null)}
      />
    </div>
  );
}
