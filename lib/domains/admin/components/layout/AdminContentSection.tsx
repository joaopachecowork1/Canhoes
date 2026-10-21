"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BarChart2, FolderTree, Gavel } from "lucide-react";

import { PillTabs } from "@/components/ui/pill-tabs";
import { useAdminBootstrap } from "../../hooks/useAdminBootstrap";
import { useAdminProposals } from "../../hooks/useAdminProposals";
import { usePendingNominationCount } from "../../hooks/usePendingNominationCount";
import { AdminNominationsSection } from "../nominations/AdminNominationsSection";
import { AdminOfficialResultsSection } from "../AdminOfficialResultsSection";
import { CategoriesAdmin } from "../categories/CategoriesAdmin";
import { PendingProposals } from "../categories/PendingProposals";
import { VotesAudit } from "../VotesAudit";
import messages from "@/messages/pt.json";

const copy = messages.admin.AdminContentSection;

/** Vistas do separador de conteúdo: fila de revisão, categorias e resultados. */
type ContentViewId = "queue" | "categorias" | "resultados";

const DEFAULT_VIEW: ContentViewId = "queue";

/** Indica se o parâmetro `view` do URL é uma vista conhecida. */
function isContentView(value: string | null): value is ContentViewId {
  return value === "queue" || value === "categorias" || value === "resultados";
}

type AdminContentSectionProps = {
  eventId: string | null;
  onUpdate: () => Promise<void>;
};

/** Renderiza a vista ativa; a fila de revisão (nomeações e propostas) é a vista por omissão. */
function ContentView({
  activeView,
  eventId,
  onUpdate,
}: Readonly<{ activeView: ContentViewId } & AdminContentSectionProps>) {
  if (activeView === "categorias") return <CategoriesAdmin eventId={eventId} onUpdate={onUpdate} />;

  if (activeView === "resultados") {
    return (
      <div className="space-y-6">
        <AdminOfficialResultsSection eventId={eventId} />
        <VotesAudit eventId={eventId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminNominationsSection eventId={eventId} />
      <PendingProposals eventId={eventId} onUpdate={onUpdate} />
    </div>
  );
}

/** Secção "Conteúdo" do admin: separadores (na query `view`) para a fila de revisão, as categorias e os resultados. */
export function AdminContentSection({ eventId, onUpdate }: Readonly<AdminContentSectionProps>) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  // a vista vive no URL (`?view=`), por isso sobrevive a recarregar a página
  const viewParam = searchParams.get("view");
  const activeView = isContentView(viewParam) ? viewParam : DEFAULT_VIEW;

  // Os contadores dos separadores leem as mesmas queries que as vistas, que a cache partilha.
  const { summary } = useAdminBootstrap(eventId);
  const { categoryProposals, measureProposals } = useAdminProposals(eventId);
  const { data: pendingNominationCount = 0 } = usePendingNominationCount(eventId);
  const queueCount = pendingNominationCount + categoryProposals.length + measureProposals.length;
  const tabs = [
    { id: "queue", label: copy.queueTab, icon: Gavel, count: queueCount },
    { id: "categorias", label: copy.categoriesTab, icon: FolderTree, count: summary?.categoriesTotal ?? 0 },
    { id: "resultados", label: copy.resultsTab, icon: BarChart2, count: summary?.officialResultsCategoriesCount ?? 0 },
  ].map(({ count, ...tab }) => ({ ...tab, badge: count > 0 ? count : undefined }));

  const handleSelectView = (nextView: string) => {
    if (nextView === activeView) return;

    const nextSearchParams = new URLSearchParams(searchParams.toString());
    // a vista por omissão não precisa de aparecer no URL
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

      <ContentView activeView={activeView} eventId={eventId} onUpdate={onUpdate} />
    </div>
  );
}
