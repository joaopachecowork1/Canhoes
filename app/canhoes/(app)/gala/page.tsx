import { EventModuleGate } from "@/lib/domains/event/components/EventModuleGate";
import { CanhoesGalaModule } from "@/lib/domains/gala/components/CanhoesGalaModule";
import { canhoesServerFetch } from "@/lib/api/canhoesServerClient";
import type { EventActiveContextDto, PublicCategoryResultDto } from "@/lib/api/types";

export default async function GalaPage() {
  const activeContext = await canhoesServerFetch<EventActiveContextDto>("events/active/context");
  const initialResults = activeContext
    ? await canhoesServerFetch<PublicCategoryResultDto[]>(`events/${activeContext.event.id}/results`)
    : null;

  return (
    <EventModuleGate moduleKey="gala">
      <CanhoesGalaModule initialContext={activeContext ?? undefined} initialResults={initialResults ?? undefined} />
    </EventModuleGate>
  );
}
