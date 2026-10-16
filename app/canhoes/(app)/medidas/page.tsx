import dynamic from "next/dynamic";
import { EventModuleGate } from "@/lib/domains/event/components/EventModuleGate";
import { FeedSkeleton } from "@/components/ui/FeedSkeleton";
import { canhoesServerFetch } from "@/lib/api/canhoesServerClient";
import type { EventActiveContextDto, GalaMeasureDto } from "@/lib/api/types";

const CanhoesMeasuresModule = dynamic(
  () => import("@/lib/domains/measures/components/CanhoesMeasuresModule").then((m) => ({ default: m.CanhoesMeasuresModule })),
  { loading: () => <FeedSkeleton /> }
);

export default async function MeasuresPage() {
  const activeContext = await canhoesServerFetch<EventActiveContextDto>("events/active/context");
  const initialData = activeContext
    ? await canhoesServerFetch<GalaMeasureDto[]>(`events/${activeContext.event.id}/measures`)
    : null;

  return (
    <EventModuleGate moduleKey="measures">
      <CanhoesMeasuresModule initialData={initialData ?? undefined} initialContext={activeContext ?? undefined} />
    </EventModuleGate>
  );
}
