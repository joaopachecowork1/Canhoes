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
import messages from "@/messages/pt.json";

const copy = messages.admin.AdminContentSection;

type ContentViewId = "queue" | "categorias" | "resultados";

const DEFAULT_VIEW: ContentViewId = "queue";

function isContentView(value: string | null): value is ContentViewId {
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

function ContentView({
  activeView,
  categoryProposals,
  eventId,
  loading,
  measureProposals,
  memberCount,
  onUpdate,
}: Readonly<
  { activeView: ContentViewId } & Pick<
    AdminContentSectionProps,
    "categoryProposals" | "eventId" | "loading" | "measureProposals" | "memberCount" | "onUpdate"
  >
>) {
  if (activeView === "categorias") return <CategoriesAdmin eventId={eventId} onUpdate={onUpdate} />;

  if (activeView === "resultados") {
    return (
      <div className="space-y-6">
        <AdminOfficialResultsSection eventId={eventId} memberCount={memberCount} />
        <VotesAudit eventId={eventId} />
      </div>
    );
  }

  return (
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
}

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
    { id: "queue", label: copy.queueTab, icon: Gavel, count: queueCount },
    { id: "categorias", label: copy.categoriesTab, icon: FolderTree, count: categoriesCount },
    { id: "resultados", label: copy.resultsTab, icon: BarChart2, count: officialResultsCount },
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

  return (
    <div className="space-y-4">
      <PillTabs
        items={tabs}
        activeId={activeView}
        onSelect={handleSelectView}
        size="sm"
        className="text-[var(--color-text-primary)]"
      />

      <ContentView
        activeView={activeView}
        categoryProposals={categoryProposals}
        eventId={eventId}
        loading={loading}
        measureProposals={measureProposals}
        memberCount={memberCount}
        onUpdate={onUpdate}
      />
    </div>
  );
}
