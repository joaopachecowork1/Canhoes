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
import { useNominationsModule } from "../hooks/useNominationsModule";
import messages from "@/messages/pt.json";

const copy = messages.voting.CanhoesNominationsModule;

type Nominations = ReturnType<typeof useNominationsModule>;

function NominationsBoard({ nominations }: Readonly<{ nominations: Nominations }>) {
  const { selectedCategory, myNominations } = nominations;
  const hasSent = (categoryId: string) => myNominations.some((mine) => mine.categoryId === categoryId);

  return (
    <div className="space-y-4">
      <CanhoesModuleHeader
        icon={Trophy}
        title={copy.title}
        description={copy.description}
        badgeLabel={formatCount(nominations.categories.length, copy.categoryOne, copy.categoryOther)}
      />
      <CompactSegmentTabs
        activeId={selectedCategory?.id ?? ""}
        items={nominations.categories.map((category) => ({
          id: category.id,
          label: category.name,
          badge: hasSent(category.id) ? copy.sentBadge : undefined,
        }))}
        onSelect={nominations.setSelectedCategoryId}
      />
      {selectedCategory ? (
        <CategoryNominationCard
          category={selectedCategory}
          eventId={nominations.queryEventId}
          isPhaseOpen={nominations.isPhaseOpen}
          myNomination={myNominations.find((mine) => mine.categoryId === selectedCategory.id)}
          approvedNominees={nominations.approvedNominees.filter((nominee) => nominee.categoryId === selectedCategory.id)}
          onNominationSubmitted={nominations.refreshMyNominations}
          queryClient={nominations.queryClient}
        />
      ) : null}
    </div>
  );
}

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

  if (nominations.isLoading && nominations.categories.length === 0) {
    return (
      <div className="space-y-3">
        <CanhoesModuleHeader icon={Trophy} title={copy.title} description={copy.loadingDescription} />
        <NominationsLoadingState />
      </div>
    );
  }

  if (!nominations.eventId || nominations.error) {
    return (
      <ErrorAlert
        title={copy.loadErrorTitle}
        description={getErrorMessage(nominations.error, copy.loadError)}
        actionLabel={messages.common.retry}
        tone="official"
        onAction={nominations.refreshQueries}
      />
    );
  }

  if (nominations.categories.length === 0) {
    return <EmptyState className="py-8" icon={Trophy} title={copy.noCategoriesTitle} description={copy.noCategoriesDescription} tone="official" />;
  }

  if (!nominations.isPhaseOpen) {
    return <EmptyState className="py-10 opacity-90" icon={Lock} title={copy.closedTitle} description={copy.closedDescription} tone="official" />;
  }

  return <NominationsBoard nominations={nominations} />;
}
