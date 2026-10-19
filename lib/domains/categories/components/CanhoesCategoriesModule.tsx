"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flame, Inbox, Search, Trophy } from "lucide-react";

import type { EventActiveContextDto, AwardCategoryDto } from "@/lib/api/types";
import { getErrorMessage } from "@/lib/errors";
import { formatMessage } from "@/lib/messages";
import { awardsRepo } from "@/lib/repositories/awardsRepo";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { CanhoesModuleHeader } from "@/lib/domains/event/components/CanhoesModuleHeader";
import { getPhaseLabel } from "@/lib/canhoesEvent";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import messages from "@/messages/pt.json";

import { CategoryProposalForm } from "./CategoryProposalForm";

const copy = messages.categories.CanhoesCategoriesModule;

function CategoriesLoadingState() {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="flex items-center gap-3.5 rounded-2xl border border-[var(--color-veil)]/5 bg-[var(--bg-paper-soft)] p-4">
          <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/5 rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function CategoryRow({ category, index }: Readonly<{ category: AwardCategoryDto; index: number }>) {
  // The fade-in animation staggers rows by this index (see app/globals.css).
  const style: CSSProperties & Record<"--item-index", number> = { "--item-index": index };

  return (
    <div
      className="flex items-center gap-3.5 rounded-2xl border border-[var(--color-veil)]/5 bg-[var(--bg-paper-soft)] p-4 transition duration-200 hover:border-[var(--color-veil)]/10 hover:bg-[var(--color-veil)]/6 animate-fade-slide-up"
      style={style}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--moss)]/12">
        <Trophy className="h-5 w-5 text-[var(--moss-glow)]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-bold text-[var(--ink-primary)]">{category.name}</p>
        <p className="mt-0.5 truncate text-xs text-[var(--ink-secondary)]">{category.description || copy.noDescription}</p>
      </div>
      <Badge variant={category.isActive ? "default" : "outline"}>{category.isActive ? copy.active : copy.inactive}</Badge>
    </div>
  );
}

function CategoryList({
  categories,
  errorMessage,
  isLoading,
  onRetry,
}: Readonly<{ categories: AwardCategoryDto[]; errorMessage: string | null; isLoading: boolean; onRetry: () => void }>) {
  return (
    <>
      {errorMessage ? (
        <ErrorAlert title={copy.loadErrorTitle} description={errorMessage} actionLabel={messages.common.retry} tone="official" onAction={onRetry} />
      ) : null}
      {isLoading && categories.length === 0 ? <CategoriesLoadingState /> : null}
      {!isLoading && !errorMessage && categories.length === 0 ? (
        <EmptyState icon={Inbox} title={copy.emptyTitle} description={copy.emptyDescription} tone="official" />
      ) : null}
      {categories.length > 0 ? (
        <>
          <div className="space-y-2.5">
            {categories.map((category, index) => (
              <CategoryRow key={category.id} category={category} index={index} />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

function matchesSearch(category: AwardCategoryDto, searchTerm: string) {
  return `${category.name} ${category.description ?? ""}`.toLowerCase().includes(searchTerm);
}

/** Categorias page: the edition's categories and the form to propose a new one. */
export function CanhoesCategoriesModule({ initialContext, initialCategories }: {
  initialContext?: EventActiveContextDto | null;
  initialCategories?: AwardCategoryDto[];
}) {
  const { event, overview, isLoading: isOverviewLoading } = useEventOverview(initialContext);
  const queryClient = useQueryClient();
  const eventId = event?.id;
  const [search, setSearch] = useState("");

  const { data: categoryList = [], isLoading, error } = useQuery({
    queryKey: ["categories", eventId],
    queryFn: () => awardsRepo.getCategories(eventId ?? "").then((result) => result.items),
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2,
    initialData: initialCategories,
  });

  const searchTerm = search.trim().toLowerCase();
  const filteredCategories = searchTerm ? categoryList.filter((category) => matchesSearch(category, searchTerm)) : categoryList;

  return (
    <div className="space-y-5">
      <div className="sticky top-0 z-10 -mx-4 px-4 pb-4 pt-2 backdrop-blur-xl bg-[var(--bg-void)]/80 border-b border-[var(--color-veil)]/5">
        <CanhoesModuleHeader
          icon={Flame}
          title={copy.title}
          description={copy.description}
          badgeLabel={overview ? formatMessage(messages.measures.CanhoesMeasuresModule.phaseBadge, { phase: getPhaseLabel(overview.activePhase?.type) }) : undefined}
        />
      </div>

      <CategoryProposalForm canPropose={Boolean(overview?.permissions.canSubmitProposal)} eventId={eventId} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{copy.title}</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-muted)] pointer-events-none" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.searchPlaceholder} className="h-10 pl-9" />
          </div>
          <CategoryList
            categories={filteredCategories}
            errorMessage={error ? getErrorMessage(error, copy.loadError) : null}
            isLoading={isLoading || isOverviewLoading}
            onRetry={() => void queryClient.invalidateQueries({ queryKey: ["categories", eventId] })}
          />
        </CardContent>
      </Card>
    </div>
  );
}
