import { lazy, type ReactNode } from "react";

import type { EventAdminStateDto } from "@/lib/api/types";

import type { AdminSectionId } from "./adminSections";
const AdminContentSection = lazy(() =>
  import("./layout/AdminContentSection").then((module) => ({ default: module.AdminContentSection }))
);
const AdminMembersSection = lazy(() =>
  import("./users/AdminMembersSection").then((module) => ({ default: module.AdminMembersSection }))
);
const AdminOverviewSection = lazy(() =>
  import("./overview/AdminOverviewSection").then((module) => ({ default: module.AdminOverviewSection }))
);
const AdminControlCenter = lazy(() =>
  import("./overview/AdminControlCenter").then((module) => ({ default: module.AdminControlCenter }))
);

type BuildSectionContentArgs = {
  activeEventName: string | null;
  categoriesCount: number;
  categoryProposals: Parameters<typeof AdminContentSection>[0]["categoryProposals"];
  events: { id: string; name: string }[];
  eventId: string | null;
  eventState: EventAdminStateDto | null;
  handleRefresh: () => Promise<void>;
  isLoading: boolean;
  measureProposals: Parameters<typeof AdminContentSection>[0]["measureProposals"];
  pendingNominationCount: number;
  summary: {
    memberCount: number;
    officialResultsCategoryCount: number;
  };
};

/** Builds the selected admin area without coupling the shell to section props. */
export function buildAdminSectionContent({
  activeEventName,
  categoriesCount,
  categoryProposals,
  events,
  eventId,
  eventState,
  handleRefresh,
  isLoading,
  measureProposals,
  pendingNominationCount,
  summary,
}: Readonly<BuildSectionContentArgs>): Record<AdminSectionId, () => ReactNode> {
  return {
    dashboard: () => (
      <AdminOverviewSection
        activeEventName={activeEventName}
        eventId={eventId}
        loading={isLoading}
        pendingCategoryProposalsCount={categoryProposals.length}
        pendingMeasureProposalsCount={measureProposals.length}
        pendingNominationCount={pendingNominationCount}
        state={eventState}
      />
    ),
    conteudo: () => (
      <AdminContentSection
        categoryProposals={categoryProposals}
        categoriesCount={categoriesCount}
        eventId={eventId}
        memberCount={summary.memberCount}
        officialResultsCount={summary.officialResultsCategoryCount}
        pendingNominationCount={pendingNominationCount}
        loading={isLoading}
        measureProposals={measureProposals}
        onUpdate={handleRefresh}
      />
    ),
    membros: () => (
      <AdminMembersSection
        eventId={eventId}
        onUpdate={handleRefresh}
        loading={isLoading}
      />
    ),
    configuracoes: () => (
      <AdminControlCenter
        eventId={eventId}
        events={events}
        loading={isLoading}
        onRefresh={handleRefresh}
        state={eventState}
      />
    ),
  };
}
