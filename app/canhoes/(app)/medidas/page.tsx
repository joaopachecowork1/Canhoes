import { AreaTabs } from "@/lib/domains/event/components/AreaTabs";
import dynamic from "next/dynamic";
import { EventModuleGate } from "@/lib/domains/event/components/EventModuleGate";
import { FeedSkeleton } from "@/components/ui/FeedSkeleton";
import { canhoesServerFetch } from "@/lib/api/canhoesServerClient";
import type { EventActiveContextDto, GalaMeasureDto } from "@/lib/api/types";

/** Carregado a pedido, para as medidas não pesarem nas outras páginas. */
const CanhoesMeasuresModule = dynamic(
  () =>
    import("@/lib/domains/measures/components/CanhoesMeasuresModule").then((m) => ({
      default: m.CanhoesMeasuresModule,
    })),
  { loading: () => <FeedSkeleton /> },
);

/** Página das medidas da gala: pré-carrega a lista de medidas do evento ativo. */
export default async function MeasuresPage() {
  const activeContext = await canhoesServerFetch<EventActiveContextDto>("events/active/context");
  const initialData = activeContext
    ? await canhoesServerFetch<GalaMeasureDto[]>(`events/${activeContext.event.id}/measures`)
    : null;

  return (
    <EventModuleGate moduleKey="measures">
      <div className="space-y-4">
        <AreaTabs current="measures" modules={activeContext?.overview.modules} />
        <CanhoesMeasuresModule initialData={initialData ?? undefined} initialContext={activeContext ?? undefined} />
      </div>
    </EventModuleGate>
  );
}
