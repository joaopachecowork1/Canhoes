import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/canhoesClient";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { queryKeys } from "@/lib/queryKeys";
import { storiesRepo } from "@/lib/repositories/storiesRepo";
import messages from "@/messages/pt.json";

const copy = messages.stories.useDeleteStory;

/** Devolve a função que apaga uma story e atualiza a lista; diz com um toast se correu bem e devolve se apagou. */
export function useDeleteStory(eventId: string | null) {
  const queryClient = useQueryClient();

  return useCallback(
    async (storyId: string) => {
      if (!eventId) return false;
      try {
        await storiesRepo.remove(eventId, storyId);
        // A resposta já confirma que foi apagada: a lista atualiza-se por trás.
        void queryClient.invalidateQueries({ queryKey: queryKeys.stories(eventId) });
        toast.success(copy.deleted);
        return true;
      } catch (error) {
        // Já não existe (expirou ou alguém a apagou): é o que se queria, só falta atualizar a lista.
        if (error instanceof ApiError && error.status === 404) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.stories(eventId) });
          return true;
        }
        logFrontendError("StoryViewer.delete", error);
        toast.error(getErrorMessage(error, copy.deleteError));
        return false;
      }
    },
    [eventId, queryClient],
  );
}
