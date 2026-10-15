"use client";

import { useMemo } from "react";
import { CheckCircle2, Flame, Loader2, Vote } from "lucide-react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { CastOfficialVoteRequest, EventActiveContextDto, EventVotingBoardDto, EventVotingCategoryDto } from "@/lib/api/types";
import { useEventOverview } from "@/hooks/useEventOverview";
import { useCategorySelection } from "./useCategorySelection";
import { CompactSegmentTabs } from "@/lib/domains/event/components/CompactSegmentTabs";
import { awardsRepo } from "@/lib/repositories/awardsRepo";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { CanhoesFeatureCard, CanhoesModuleHeader } from "@/components/modules/canhoes/CanhoesModuleParts";
import { Card, CardContent } from "@/components/ui/card";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { VirtualizedList } from "@/components/ui/virtualized-list";

function OfficialVotingLoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 rounded-[var(--radius-lg-token)]" />
      <Skeleton className="h-10 rounded-full" />
      <div className="space-y-3 rounded-[var(--radius-lg-token)] border border-[rgba(255,255,255,0.12)] bg-[rgba(22,28,15,0.88)] p-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2 rounded-[var(--radius-md-token)] border border-[rgba(255,255,255,0.1)] p-3">
            <Skeleton className="h-4 w-3/5 rounded" />
            <Skeleton className="h-3 w-2/5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CanhoesOfficialVotingModule({ initialData, initialContext }: { initialData?: EventVotingBoardDto; initialContext?: EventActiveContextDto | null }) {
  const queryClient = useQueryClient();
  const { event } = useEventOverview(initialContext);

  const eventId = event?.id ?? null;
  const activeEventId = eventId ?? "";

  const votingBoardQuery = useQuery({
    queryKey: ["official-voting", activeEventId],
    enabled: Boolean(eventId),
    queryFn: () => awardsRepo.getVotingBoard(activeEventId),
    initialData,
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 3,
    refetchOnWindowFocus: false,
    refetchInterval: () =>
      typeof document !== "undefined" && document.visibilityState === "visible" ? 20_000 : false,
  });

  const officialVotingCategories = useMemo(
    () => votingBoardQuery.data?.categories ?? [],
    [votingBoardQuery.data]
  );

  const { selectedId: selectedCategoryId, setSelectedId: setSelectedCategoryId, selectedItem: selectedCategory } =
    useCategorySelection(officialVotingCategories, (category) => category.id);

  const castOfficialVoteMutation = useMutation({
    mutationFn: (votePayload: CastOfficialVoteRequest) =>
      awardsRepo.castOfficialVote(activeEventId, votePayload),
    onMutate: async (votePayload) => {
      if (!eventId) return { previousBoardData: null };

      await queryClient.cancelQueries({ queryKey: ["official-voting", activeEventId] });
      const previousBoardData = queryClient.getQueryData<EventVotingBoardDto>(["official-voting", activeEventId]);

      queryClient.setQueryData<EventVotingBoardDto>(["official-voting", activeEventId], (oldData) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          categories: oldData.categories.map((category) =>
            category.id === votePayload.categoryId
              ? { ...category, myOptionId: votePayload.selectionId }
              : category
          ),
        };
      });

      return { previousBoardData };
    },
    onError: (error, _votePayload, mutationContext) => {
      if (eventId && mutationContext?.previousBoardData) {
        queryClient.setQueryData(["official-voting", activeEventId], mutationContext.previousBoardData);
      }
      logFrontendError("CanhoesOfficialVoting.castVote", error, { eventId });
      toast.error(getErrorMessage(error, "Não foi possível registar o voto. Tenta novamente."));
    },
    onSuccess: async () => {
      if (!eventId) return;
      await queryClient.invalidateQueries({ queryKey: ["official-voting", activeEventId], exact: true });
    },
  });

  if (votingBoardQuery.isLoading) {
    return (
      <div className="space-y-3">
        <CanhoesModuleHeader
          icon={Vote}
          title="Boletim oficial"
          description="Participação oficial com uma escolha validada por categoria."
        />
        <OfficialVotingLoadingState />
      </div>
    );
  }

  if (!eventId || votingBoardQuery.error || !votingBoardQuery.data) {
    return (
      <ErrorAlert
        title="Erro ao carregar boletim oficial"
        description={getErrorMessage(votingBoardQuery.error, "Não foi possível abrir o boletim oficial.")}
        actionLabel="Tentar novamente"
        tone="official"
        onAction={() => void votingBoardQuery.refetch()}
      />
    );
  }

  const officialVotingBoard = votingBoardQuery.data;
  const totalCategoriesCount = officialVotingBoard.categories.length;
  const votedCategoriesCount = officialVotingBoard.categories.filter((category) => Boolean(category.myOptionId)).length;
  const votingCompletionPercentage = totalCategoriesCount > 0 
    ? Math.round((votedCategoriesCount / totalCategoriesCount) * 100) 
    : 0;

  return (
    <div className="space-y-4">
      <CanhoesModuleHeader
        icon={Vote}
        title="Boletim oficial"
        description="Área oficial de voto, separada das sondagens do mural."
        badgeLabel={`${votedCategoriesCount}/${totalCategoriesCount}`}
      />

      <Card className="rounded-2xl border-[var(--border-paper)] bg-[var(--bg-paper)] text-[var(--ink-primary)]">
        <CardContent className="space-y-3 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--ink-secondary)]">Votaste em {votedCategoriesCount} de {totalCategoriesCount} categorias oficiais</span>
            <span className="font-[var(--font-mono)] text-[var(--ink-primary)]">{votingCompletionPercentage}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[rgba(95,123,56,0.16)]">
            <div className="h-full rounded-full bg-[var(--moss)] transition-all" style={{ width: `${votingCompletionPercentage}%` }} />
          </div>
        </CardContent>
      </Card>

      <CompactSegmentTabs
        activeId={selectedCategoryId ?? ""}
        items={officialVotingCategories.map((category) => ({
          id: category.id,
          label: category.title,
          badge: category.myOptionId ? "Votado" : undefined,
        }))}
        onSelect={setSelectedCategoryId}
      />

      {selectedCategory ? (
        <OfficialVotingCategoryCard
          category={selectedCategory}
          canVote={officialVotingBoard.canVote}
          isBusy={castOfficialVoteMutation.isPending}
          onVote={(votePayload) => castOfficialVoteMutation.mutate(votePayload)}
          pendingPayload={castOfficialVoteMutation.variables ?? null}
        />
      ) : null}

      {votedCategoriesCount === totalCategoriesCount && totalCategoriesCount > 0 ? (
        <Card className="rounded-2xl border-[rgba(95,123,56,0.28)] bg-[rgba(95,123,56,0.1)] px-4 text-[var(--ink-primary)]">
          <CardContent className="py-6 text-center font-semibold text-[var(--moss)]">
            Boletim oficial completo
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function OfficialVotingCategoryCard({
  category,
  canVote,
  isBusy,
  onVote,
  pendingPayload,
}: Readonly<{
  category: EventVotingCategoryDto;
  canVote: boolean;
  isBusy: boolean;
  onVote: (payload: CastOfficialVoteRequest) => void;
  pendingPayload: CastOfficialVoteRequest | null;
}>) {
  return (
    <CanhoesFeatureCard
      title={category.title}
      description={category.description ?? undefined}
      icon={Flame}
      className="relative"
    >
      {canVote ? null : (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-[rgba(42,30,21,0.12)] backdrop-blur-[1px] text-xs uppercase tracking-[0.12em] text-[var(--ink-muted)]">
          Boletim encerrado
        </div>
      )}

      {category.options.length > 0 ? (
        <VirtualizedList
          items={category.options}
          getKey={(option) => option.id}
          estimateSize={() => 72}
          className="max-h-[52svh]"
          renderItem={(option) => {
            const isOptionSelected = category.myOptionId === option.id;
            const isVotePending = isBusy && pendingPayload?.categoryId === category.id && pendingPayload.selectionId === option.id;
            let statusIcon = null;

            if (isVotePending) {
              statusIcon = <Loader2 className="h-4 w-4 animate-spin" />;
            } else if (isOptionSelected) {
              statusIcon = <CheckCircle2 className="h-4 w-4" />;
            }

            return (
              <button
                type="button"
                disabled={!canVote || isBusy}
                onClick={() => onVote({ categoryId: category.id, selectionId: option.id })}
                className={cn(
                  "canhoes-list-item w-full text-left px-3 py-2 flex items-center justify-between gap-3 border-[var(--border-paper-soft)] bg-[var(--bg-paper-soft)] shadow-none",
                  isOptionSelected && "border-[rgba(95,123,56,0.28)] bg-[rgba(95,123,56,0.08)]"
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--ink-primary)]">{option.label}</p>
                </div>

                <div className="shrink-0 text-[var(--moss)]">{statusIcon}</div>
              </button>
            );
          }}
        />
      ) : null}
    </CanhoesFeatureCard>
  );
}
