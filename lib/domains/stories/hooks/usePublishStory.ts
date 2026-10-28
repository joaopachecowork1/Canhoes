import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError } from "@/lib/api/canhoesClient";
import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { formatMessage } from "@/lib/messages";
import { queryKeys } from "@/lib/queryKeys";
import { storiesRepo } from "@/lib/repositories/storiesRepo";
import { isAcceptedImage, normalizeUploadImage } from "@/lib/uploadImage";
import messages from "@/messages/pt.json";

import { MAX_ACTIVE_STORIES_PER_USER, MAX_STORY_BYTES, STORY_IMAGE_TYPES } from "../rules/storyRules";

const copy = messages.stories.usePublishStory;

/** O aviso de imagem grande de mais, com o máximo (em MB) vindo da regra. */
const tooLargeMessage = () => formatMessage(copy.tooLarge, { max: MAX_STORY_BYTES / (1024 * 1024) });

/** Porque é que a imagem (já comprimida) não pode ser uma story, ou null quando pode. */
function getImageProblem(image: File) {
  if (!STORY_IMAGE_TYPES.includes(image.type)) return copy.notAnImage;
  if (image.size > MAX_STORY_BYTES) return tooLargeMessage();
  return null;
}

/** Diz se a resposta de erro da API traz este `code`. */
function hasErrorCode(error: ApiError, code: string) {
  const { details } = error;
  return typeof details === "object" && details !== null && "code" in details && details.code === code;
}

/** O texto do toast para uma publicação que falhou; o limite e o tamanho têm texto próprio, sem o detalhe em inglês do servidor. */
function toPublishErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (hasErrorCode(error, "STORY_LIMIT_REACHED"))
      return formatMessage(copy.limitReached, { max: MAX_ACTIVE_STORIES_PER_USER });
    if (error.status === 413) return tooLargeMessage();
  }
  return getErrorMessage(error, copy.publishError);
}

/** Comprime a imagem escolhida, envia-a como story e atualiza a lista; avisa com um toast do que correu. */
export function usePublishStory(eventId: string | null) {
  const queryClient = useQueryClient();
  const [isPublishing, setIsPublishing] = useState(false);

  const publish = useCallback(
    async (file: File) => {
      if (!eventId) return;
      // Um GIF animado viraria uma imagem parada ao recomprimir: recusa-se antes.
      if (!isAcceptedImage(file) || file.type === "image/gif") {
        toast.error(copy.notAnImage);
        return;
      }

      try {
        setIsPublishing(true);
        // Sem conseguir recodificar não se envia o original: podia levar a localização da foto.
        const image = await normalizeUploadImage(file, { alwaysReencode: true }).catch(() => null);
        if (!image) {
          toast.error(copy.reencodeError);
          return;
        }
        const problem = getImageProblem(image);
        if (problem) {
          toast.error(problem);
          return;
        }

        await storiesRepo.publish(eventId, image);
        // A resposta já confirma a publicação: a lista atualiza-se por trás, sem se esperar por ela.
        void queryClient.invalidateQueries({ queryKey: queryKeys.stories(eventId) });
        toast.success(copy.published);
      } catch (error) {
        logFrontendError("StoriesModule.publish", error);
        toast.error(toPublishErrorMessage(error));
      } finally {
        setIsPublishing(false);
      }
    },
    [eventId, queryClient],
  );

  return { isPublishing, publish };
}
