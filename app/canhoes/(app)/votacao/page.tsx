import { CanhoesOfficialVotingModule } from "@/lib/domains/voting/components/CanhoesOfficialVotingModule";
import { canhoesServerFetch } from "@/lib/api/canhoesServerClient";
import type { EventActiveContextDto, EventVotingBoardDto } from "@/lib/api/types";

export default async function VotingPage() {
  const activeContext = await canhoesServerFetch<EventActiveContextDto>("events/active/context");
  const initialBoard = activeContext
    ? await canhoesServerFetch<EventVotingBoardDto>(`events/${activeContext.event.id}/voting`)
    : null;

  return <CanhoesOfficialVotingModule initialData={initialBoard ?? undefined} initialContext={activeContext ?? undefined} />;
}
