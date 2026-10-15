import dynamic from "next/dynamic";
import { EventModuleGate } from "@/lib/domains/event/components/EventModuleGate";
import { FeedSkeleton } from "@/components/ui/FeedSkeleton";
import { canhoesServerFetch } from "@/lib/api/canhoesServerClient";
import type { EventActiveContextDto, EventFeedPostFullDto, PagedResult } from "@/lib/api/types";
import { toFeedPage } from "@/lib/domains/feed/components/hooks/feedInfiniteData";

const HubFeedModule = dynamic(
  () => import("@/lib/domains/feed/components/HubFeedModule").then((module) => ({ default: module.HubFeedModule })),
  { loading: () => <FeedSkeleton /> }
);

export default async function CanhoesPage() {
  const activeContext = await canhoesServerFetch<EventActiveContextDto>("events/active/context");
  const firstPage = activeContext
    ? await canhoesServerFetch<PagedResult<EventFeedPostFullDto>>(
        `events/${activeContext.event.id}/feed/posts?skip=0&take=15`
      )
    : null;

  const initialData = firstPage
    ? { pages: [toFeedPage(firstPage)], pageParams: [0] }
    : undefined;

  return (
    <EventModuleGate moduleKey="feed">
      <HubFeedModule initialData={initialData} initialContext={activeContext ?? undefined} />
    </EventModuleGate>
  );
}
