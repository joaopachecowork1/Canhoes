"use client";

import { Lock, Trophy } from "lucide-react";
import { CompactSegmentTabs } from "@/lib/domains/event/components/CompactSegmentTabs";

import type { AwardCategoryDto, EventActiveContextDto } from "@/lib/api/types";
import { getErrorMessage } from "@/lib/errors";
import { CanhoesModuleHeader } from "@/lib/domains/event/components/CanhoesModuleHeader";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorAlert } from "@/components/ui/error-alert";
import { formatCount } from "@/lib/utils";
import { CategoryNominationCard, NominationsLoadingState } from "./NominationsView";
import { useNominationsModule } from "./useNominationsModule";

/**
 * Coordinates the nomination module states; remote state and submission behavior
 * live in dedicated hooks/components so this boundary stays presentation-focused.
 */
export function CanhoesNominationsModule({
  initialCategories,
  initialContext,
}: {
  initialCategories?: AwardCategoryDto[];
  initialContext?: EventActiveContextDto | null;
}) {
  const nominations = useNominationsModule(initialCategories, initialContext);
  const isInitialLoading = nominations.isLoading && nominations.categories.length === 0;

  if (isInitialLoading) {
    return (
      <div className="space-y-3">
        <CanhoesModuleHeader icon={Trophy} title="Nomeações oficiais" description="Área oficial para propor um nome por categoria durante a fase de propostas." />
        <NominationsLoadingState />
      </div>
    );
  }

  if (!nominations.eventId || nominations.error) {
    return (
      <ErrorAlert
        title="Erro ao carregar nomeações oficiais"
        description={getErrorMessage(nominations.error, "Não foi possível carregar a área oficial de nomeações.")}
        actionLabel="Tentar novamente"
        tone="official"
        onAction={nominations.refreshQueries}
      />
    );
  }

  if (nominations.categories.length === 0) {
    return <EmptyState className="py-8" icon={Trophy} title="Sem categorias oficiais abertas" description="A área oficial de nomeações fica disponível quando existirem categorias ativas." tone="official" />;
  }

  if (!nominations.isPhaseOpen) {
    return <EmptyState className="py-10 opacity-90" icon={Lock} title="Nomeações oficiais fechadas" description="Esta área oficial volta a abrir na fase de propostas." tone="official" />;
  }

  return (
    <div className="space-y-4">
      <CanhoesModuleHeader icon={Trophy} title="Nomeações oficiais" description="Cada membro pode submeter uma nomeação oficial por categoria." badgeLabel={formatCount(nominations.categories.length, "categoria", "categorias")} />
      <CompactSegmentTabs
        activeId={nominations.selectedCategory?.id ?? ""}
        items={nominations.categories.map((category) => ({
          id: category.id,
          label: category.name,
          badge: nominations.myStatus?.hasNomination && nominations.myStatus.nomineeId === category.id ? "Enviado" : undefined,
        }))}
        onSelect={nominations.setSelectedCategoryId}
      />
      {nominations.selectedCategory ? (
        <CategoryNominationCard
          category={nominations.selectedCategory}
          eventId={nominations.queryEventId}
          isPhaseOpen={nominations.isPhaseOpen}
          myStatus={nominations.myStatus?.nomineeId === nominations.selectedCategory.id ? nominations.myStatus : undefined}
          approvedNominees={nominations.approvedNominees.filter((nominee) => nominee.categoryId === nominations.selectedCategory?.id)}
          onNominationSubmitted={nominations.updateNominationCaches}
          queryClient={nominations.queryClient}
        />
      ) : null}
    </div>
  );
}
