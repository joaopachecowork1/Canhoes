import { useQuery } from "@tanstack/react-query";

import type { StoryAuthorDto } from "@/lib/api/types";
import { queryKeys } from "@/lib/queryKeys";
import { storiesRepo } from "@/lib/repositories/storiesRepo";

const NO_STORIES: StoryAuthorDto[] = [];

/** As stories ativas do evento, agrupadas por membro, atualizadas de três em três minutos e quando o separador volta a ser visto. */
export function useStories(eventId: string | null) {
  const query = useQuery({
    queryKey: queryKeys.stories(eventId),
    enabled: Boolean(eventId),
    queryFn: () => storiesRepo.list(eventId!),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchInterval: 180_000,
  });

  return { groups: query.data ?? NO_STORIES };
}
