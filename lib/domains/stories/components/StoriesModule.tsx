"use client";

import { useState } from "react";

import { useAuth, useIsAdmin } from "@/components/providers/AuthContext";
import type { EventActiveContextDto, StoryAuthorDto } from "@/lib/api/types";
import { useEventMembers } from "@/lib/domains/event/hooks/useEventMembers";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";

import { useDeleteStory } from "../hooks/useDeleteStory";
import { usePublishStory } from "../hooks/usePublishStory";
import { useStories } from "../hooks/useStories";
import { buildStripItems } from "../rules/storyStrip";
import { StoriesStrip } from "./StoriesStrip";
import { StoryViewer } from "./StoryViewer";

/** O que o visualizador mostra: as stories de quando se abriu (a lista não muda por baixo) e por onde começar. */
type Viewing = { groups: StoryAuthorDto[]; startStoryId: string };

/** As stories do evento: a faixa no topo do mural e, ao tocar num membro, o visualizador em ecrã inteiro. */
export function StoriesModule({ initialContext }: Readonly<{ initialContext?: EventActiveContextDto | null }>) {
  const { event } = useEventOverview(initialContext);
  const eventId = event?.id ?? null;
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const { groups } = useStories(eventId);
  const { data: members = [] } = useEventMembers(eventId);
  const { isPublishing, publish } = usePublishStory(eventId);
  const deleteStory = useDeleteStory(eventId);
  const [viewing, setViewing] = useState<Viewing | null>(null);

  if (!eventId) return null;

  return (
    <>
      <StoriesStrip
        items={buildStripItems(members, groups)}
        isPublishing={isPublishing}
        onPublish={(file) => void publish(file)}
        onOpen={(group) => setViewing({ groups, startStoryId: group.stories[0]!.id })}
      />
      {viewing ? (
        <StoryViewer
          groups={viewing.groups}
          startStoryId={viewing.startStoryId}
          currentUserId={user?.id ?? null}
          isAdmin={isAdmin}
          onClose={() => setViewing(null)}
          onDelete={deleteStory}
        />
      ) : null}
    </>
  );
}
