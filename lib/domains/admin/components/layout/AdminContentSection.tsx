"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart2, FolderTree, Gavel } from "lucide-react";

import { PillTabs } from "@/components/ui/pill-tabs";
import type {
  CategoryProposalDto,
  MeasureProposalDto,
} from "@/lib/api/types";
import { AdminNominationsSection } from "../nominations/AdminNominationsSection";
import { AdminOfficialResultsSection } from "../AdminOfficialResultsSection";
import { CategoriesAdmin } from "../categories/CategoriesAdmin";
import { PendingProposals } from "../categories/PendingProposals";
import { VotesAudit } from "../VotesAudit";

type ContentView = "queue" | "categorias" | "resultados";

const DEFAULT_VIEW: ContentView = "queue";

function isContentView(value: string | null): value is ContentView {
  return value === "queue" || value === "categorias" || value === "resultados";
}

type AdminContentSectionProps = {
  categoryProposals: CategoryProposalDto[];
  categoriesCount: number;
  eventId: string | null;
  loading: boolean;
  measureProposals: MeasureProposalDto[];
  memberCount: number;
  officialResultsCount: number;
  pendingNominationCount: number;
  onUpdate: () => Promise<void>;
};

export function AdminContentSection({
  categoryProposals,
  categoriesCount,
  eventId,
  loading,
  measureProposals,
  memberCount,
  officialResultsCount,
  pendingNominationCount,
  onUpdate,
}: Readonly<AdminContentSectionProps>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const viewParam = searchParams.get("view");
  const activeView = isContentView(viewParam) ? viewParam : DEFAULT_VIEW;

  const queueCount = pendingNominationCount + categoryProposals.length + measureProposals.length;
  const tabs = [
    { id: "queue", label: "Fila", icon: Gavel, count: queueCount },
    { id: "categorias", label: "Categorias", icon: FolderTree, count: categoriesCount },
    { id: "resultados", label: "Resultados", icon: BarChart2, count: officialResultsCount },
  ].map(({ count, ...tab }) => ({ ...tab, badge: count > 0 ? count : undefined }));

  const handleSelectView = (nextView: string) => {
    if (nextView === activeView) return;

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    if (nextView === DEFAULT_VIEW) {
      nextSearchParams.delete("view");
    } else {
      nextSearchParams.set("view", nextView);
    }

    const nextQuery = nextSearchParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname);
  };

  const content =
    activeView === "categorias" ? (
      <CategoriesAdmin eventId={eventId} onUpdate={onUpdate} />
    ) : activeView === "resultados" ? (
      <div className="space-y-6">
        <AdminOfficialResultsSection eventId={eventId} memberCount={memberCount} />

        <VotesAudit eventId={eventId} />
      </div>
    ) : (
      <div className="space-y-6">
        <AdminNominationsSection eventId={eventId} loading={loading} />

        <PendingProposals
          categoryProposals={categoryProposals}
          eventId={eventId}
          loading={loading}
          measureProposals={measureProposals}
          onUpdate={onUpdate}
        />
      </div>
    );

  return (
    <div className="space-y-4">
      <PillTabs
        items={tabs}
        activeId={activeView}
        onSelect={handleSelectView}
        size="sm"
        className="text-[var(--color-text-primary)]"
      />

      {content}
    </div>
  );
}
