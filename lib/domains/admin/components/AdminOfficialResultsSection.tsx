"use client";

import { useEffect, useMemo, useState } from "react";
import { Award, BarChart2, ChevronDown, ChevronUp, Medal } from "lucide-react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import type { AdminCategoryResultDto } from "@/lib/api/types";
import { adminRepo } from "@/lib/repositories/adminRepo";
import { useIsAdmin } from "@/components/providers/AuthContext";
import { cn, formatCount } from "@/lib/utils";
import { AdminStateMessage } from "@/lib/domains/admin/components/layout/AdminStateMessage";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const EMPTY_ADMIN_CATEGORY_RESULTS: AdminCategoryResultDto[] = [];

import {
  ADMIN_CONTENT_CARD_CLASS,
  ADMIN_OUTLINE_BUTTON_CLASS,
  AdminDetailPanel,
  AdminDetailSheet,
  AdminListPanel,
  AdminSelectableButton,
} from "./adminContentUi";

function getParticipationClass(rate: number) {
  if (rate < 0.5) return "text-[var(--neon-red)]";
  if (rate < 0.8) return "text-[var(--neon-amber)]";
  return "text-[var(--neon-green)]";
}

function getRankMeta(index: number) {
  if (index === 0) {
    return {
      fillClass: "bg-[var(--neon-amber)]",
      iconClassName: "text-[var(--neon-amber)]",
      Icon: Award,
    };
  }

  if (index === 1) {
    return {
      fillClass: "bg-[var(--text-muted)]",
      iconClassName: "text-[var(--ink-muted)]",
      Icon: Medal,
    };
  }

  if (index === 2) {
    return {
      fillClass: "bg-[var(--bark)]",
      iconClassName: "text-[var(--bark)]",
      Icon: Medal,
    };
  }

  return {
    fillClass: "bg-[var(--bark)]",
    iconClassName: "text-[var(--ink-muted)]",
    Icon: null,
  };
}

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
    <AdminSelectableButton type="button" onClick={() => onSelect(category.categoryId)} selected={isSelected} aria-pressed={isSelected}>
      <p className="truncate text-sm font-semibold text-[var(--ink-primary)]">{category.categoryName}</p>
      <p className="mt-1 text-xs text-[var(--ink-secondary)]">{category.totalVotes}/{totalMembers} votaram ({participationRate}%)</p>
    </AdminSelectableButton>
  );
}

type AdminCategoryNomineeResult = {
  nomineeId: string;
  title: string;
  imageUrl: string | null;
  voteCount: number;
  voterUserIds: string[];
};

function ResultsNomineeBar({
  nominee,
  index,
  totalVotes,
}: Readonly<{
  nominee: AdminCategoryNomineeResult;
  index: number;
  totalVotes: number;
}>) {
  const { fillClass, iconClassName, Icon } = getRankMeta(index);
  const percentage = totalVotes > 0 ? Math.round((nominee.voteCount / totalVotes) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? <Icon className={cn("h-4 w-4 shrink-0", iconClassName)} /> : null}
          <p className="truncate text-sm text-[var(--ink-primary)]">{nominee.title}</p>
        </div>
        <span className="text-xs text-[var(--ink-secondary)]">{formatCount(nominee.voteCount, "voto", "votos")} ({percentage}%)</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-paper-soft)]">
        <div className={cn("h-full", fillClass)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function ResultsVotersList({
  nominees,
}: Readonly<{
  nominees: AdminCategoryNomineeResult[];
}>) {
  return (
    <AdminDetailPanel className="max-h-[34svh] space-y-1 overflow-y-auto">
      {nominees.map((nominee) => (
        <p key={nominee.nomineeId} className="text-xs text-[var(--ink-secondary)]">
          <span className="text-[var(--ink-primary)]">{nominee.title}</span>: {nominee.voterUserIds.join(", ") || "Sem votos"}
        </p>
      ))}
    </AdminDetailPanel>
  );
}

export function AdminOfficialResultsSection({
  eventId,
  memberCount,
}: Readonly<{
  eventId: string | null;
  memberCount: number;
}>) {
  const isAdmin = useIsAdmin();
  const [isVotersVisible, setIsVotersVisible] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const queryEventId = eventId ?? "";

  const resultsQuery = useQuery<AdminCategoryResultDto[]>({
    queryKey: ["canhoes", "admin", "official-results", queryEventId],
    enabled: Boolean(eventId) && isAdmin,
    queryFn: async () => {
      const page = await adminRepo.getOfficialResultsPaged(queryEventId);
      return page.items;
    },
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 2,
  });

  const resultCategories = resultsQuery.data ?? EMPTY_ADMIN_CATEGORY_RESULTS;

  const selectedCategory = useMemo(
    () =>
      resultCategories.find((category) => category.categoryId === selectedCategoryId) ?? null,
    [resultCategories, selectedCategoryId]
  );

  const sortedNominees = useMemo<AdminCategoryNomineeResult[]>(
    () =>
      selectedCategory
        ? [...selectedCategory.nominees].sort((left, right) => right.voteCount - left.voteCount)
        : [],
    [selectedCategory]
  );

  useEffect(() => {
    setIsVotersVisible(false);
  }, [selectedCategoryId]);

  if (!isAdmin) {
    return (
      <AdminStateMessage tone="warning">Secção disponível apenas para admins.</AdminStateMessage>
    );
  }

  if (!eventId) {
    return <AdminStateMessage>Falta uma edição ativa para consultar resultados.</AdminStateMessage>;
  }

  if (resultsQuery.isLoading) {
    return <AdminStateMessage>A carregar resultados oficiais...</AdminStateMessage>;
  }

  if (resultsQuery.error) {
    return (
      <AdminStateMessage
        tone="warning"
        action={
          <Button onClick={() => void resultsQuery.refetch()} className={ADMIN_OUTLINE_BUTTON_CLASS}>
            Tentar novamente
          </Button>
        }
      >
        Não foi possível carregar os resultados oficiais.
      </AdminStateMessage>
    );
  }

  const refreshedAt = resultsQuery.dataUpdatedAt
    ? new Date(resultsQuery.dataUpdatedAt).toLocaleString("pt-PT")
    : null;

  return (
    <div className="space-y-4">
      <Card className={ADMIN_CONTENT_CARD_CLASS}>
        <CardHeader className="space-y-1">
          <p className="editorial-kicker">Análise</p>
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            Resultados oficiais
          </CardTitle>
          {refreshedAt ? <p className="text-xs text-[var(--ink-secondary)]">Atualizado em {refreshedAt}</p> : null}
        </CardHeader>
      </Card>

      {resultCategories.length === 0 ? (
        <AdminStateMessage variant="panel">
          Ainda não existem resultados oficiais para esta edição.
        </AdminStateMessage>
      ) : null}

      {resultCategories.length > 0 ? (
        <AdminListPanel>
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
        </AdminListPanel>
      ) : null}

      <AdminDetailSheet
        open={Boolean(selectedCategory)}
        onOpenChange={(open) => !open && setSelectedCategoryId(null)}
        kicker="Resultados"
        title={selectedCategory?.categoryName ?? ""}
        description={
          selectedCategory
            ? `${selectedCategory.totalVotes}/${memberCount} membros votaram (${Math.round(
                selectedCategory.participationRate * 100
              )}%)`
            : undefined
        }
      >
        {selectedCategory ? (
          <>
            <AdminDetailPanel className={cn(getParticipationClass(selectedCategory.participationRate), "bg-[var(--bg-paper-soft)]") }>
              Participação {Math.round(selectedCategory.participationRate * 100)}%
            </AdminDetailPanel>

            <div className="space-y-2">
              {sortedNominees.map((nominee, index) => (
                <ResultsNomineeBar
                  key={nominee.nomineeId}
                  nominee={nominee}
                  index={index}
                  totalVotes={selectedCategory.totalVotes}
                />
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              className={`${ADMIN_OUTLINE_BUTTON_CLASS} w-full justify-center`}
              onClick={() => setIsVotersVisible((current) => !current)}
            >
              {isVotersVisible ? (
                <ChevronUp className="mr-2 h-4 w-4" />
              ) : (
                <ChevronDown className="mr-2 h-4 w-4" />
              )}
              Ver eleitores
            </Button>

            {isVotersVisible ? <ResultsVotersList nominees={sortedNominees} /> : null}
          </>
        ) : null}
      </AdminDetailSheet>
    </div>
  );
}
