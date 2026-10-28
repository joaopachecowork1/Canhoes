import dynamic from "next/dynamic";
import { EventModuleGate } from "@/lib/domains/event/components/EventModuleGate";
import { FeedSkeleton } from "@/components/ui/FeedSkeleton";
import { canhoesServerFetch } from "@/lib/api/canhoesServerClient";
import type { EventActiveContextDto, EventFeedPostFullDto, PagedResult } from "@/lib/api/types";
import { toFeedPage } from "@/lib/domains/feed/hooks/feedInfiniteData";
import { CanhoesHomeDashboard } from "@/lib/domains/event/components/CanhoesHomeDashboard";

/** Mural carregado a pedido, com esqueleto enquanto não chega. */
const HubFeedModule = dynamic(
  () => import("@/lib/domains/feed/components/HubFeedModule").then((module) => ({ default: module.HubFeedModule })),
  { loading: () => <FeedSkeleton /> },
);

/** Faixa de stories noutro chunk; reserva a altura da faixa enquanto chega, para o mural não saltar. */
const StoriesModule = dynamic(
  () => import("@/lib/domains/stories/components/StoriesModule").then((module) => ({ default: module.StoriesModule })),
  { loading: () => <div className="h-28" aria-hidden="true" /> },
);

/** Página inicial: painel do evento, stories e mural, com a primeira página de posts já carregada no servidor. */
export default async function CanhoesPage() {
  const activeContext = await canhoesServerFetch<EventActiveContextDto>("events/active/context");
  const firstPage = activeContext
    ? await canhoesServerFetch<PagedResult<EventFeedPostFullDto>>(
        `events/${activeContext.event.id}/feed/posts?skip=0&take=15`,
      )
    : null;

  const initialData = firstPage ? { pages: [toFeedPage(firstPage)], pageParams: [0] } : undefined;

  return (
    <EventModuleGate moduleKey="feed">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <CanhoesHomeDashboard context={activeContext} />
        <StoriesModule initialContext={activeContext ?? undefined} />
        <HubFeedModule initialData={initialData} initialContext={activeContext ?? undefined} />
      </div>
    </EventModuleGate>
  );
}
