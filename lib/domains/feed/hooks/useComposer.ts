"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";

import {
  isAcceptedImage,
  MAX_FILE_BYTES,
  MAX_FILE_MB,
  normalizeUploadImage,
} from "../components/compose/composeUpload";
import { getFileKey, MAX_MEDIA_FILES, MAX_POLL_OPTIONS, MIN_POLL_OPTIONS, moveItem } from "../rules/composeRules";

const copy = messages.feed.compose;
const EMPTY_POLL_OPTIONS = ["", ""];

type MediaDraft = { file: File; previewUrl: string };

// Liberta as URLs de pré-visualização (`blob:`) para o browser largar a memória das imagens.
const revoke = (media: MediaDraft[]) => media.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));

/**
 * As imagens escolhidas com os seus URLs de pré-visualização. O URL é criado quando o ficheiro é adicionado e
 * libertado quando é removido, no reset e ao desmontar, para nenhum effect ter de os manter sincronizados.
 */
function useMediaDraft() {
  const [media, setMedia] = useState<MediaDraft[]>([]);
  // Os handlers lêem e escrevem aqui, nunca o render, por isso cada URL é criado e libertado uma só vez.
  const mediaRef = useRef<MediaDraft[]>([]);

  // Ao desmontar liberta o que sobrou.
  useEffect(() => () => revoke(mediaRef.current), []);

  // Liberta só os URLs das entradas que saem da lista; as que ficam mantêm o seu URL.
  const commit = useCallback((next: MediaDraft[]) => {
    revoke(mediaRef.current.filter((entry) => !next.includes(entry)));
    mediaRef.current = next;
    setMedia(next);
  }, []);

  /** Recebe a nova lista completa de ficheiros, mantendo os URLs dos que já lá estavam. */
  const setFiles = useCallback(
    (files: File[]) =>
      commit(
        files.map(
          (file) =>
            mediaRef.current.find((entry) => entry.file === file) ?? { file, previewUrl: URL.createObjectURL(file) },
        ),
      ),
    [commit],
  );
  const removeFile = useCallback(
    (index: number) => commit(mediaRef.current.filter((_, currentIndex) => currentIndex !== index)),
    [commit],
  );
  const moveFile = useCallback(
    (index: number, direction: -1 | 1) => commit(moveItem(mediaRef.current, index, direction)),
    [commit],
  );

  return { media, setFiles, removeFile, moveFile };
}

/** O rascunho da sondagem: pergunta e opções (entre o mínimo e o máximo permitidos). */
function usePollDraft() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(EMPTY_POLL_OPTIONS);

  const changeOption = useCallback((index: number, value: string) => {
    setOptions((current) => current.map((option, currentIndex) => (currentIndex === index ? value : option)));
  }, []);

  const addOption = useCallback(() => {
    setOptions((current) => (current.length < MAX_POLL_OPTIONS ? [...current, ""] : current));
  }, []);

  const removeOption = useCallback((index: number) => {
    setOptions((current) =>
      current.length > MIN_POLL_OPTIONS ? current.filter((_, currentIndex) => currentIndex !== index) : current,
    );
  }, []);

  const reset = useCallback(() => {
    setIsEnabled(false);
    setQuestion("");
    setOptions(EMPTY_POLL_OPTIONS);
  }, []);

  return { isEnabled, setIsEnabled, question, setQuestion, options, changeOption, addOption, removeOption, reset };
}

/** Porque é que um ficheiro recebido é recusado, ou null quando pode ser adicionado. */
function getFileRejection(file: File) {
  if (!isAcceptedImage(file)) return copy.unsupportedFormat;
  if (file.size > MAX_FILE_BYTES) return `${copy.fileTooLargeLabel} ${MAX_FILE_MB}MB`;
  return null;
}

/**
 * Junta as imagens escolhidas a `currentFiles`: salta duplicados e ficheiros não suportados ou demasiado grandes
 * (com um toast), pára no limite e reduz fotos grandes para o envio ser mais rápido.
 */
async function prepareFiles(currentFiles: File[], fileList: FileList) {
  const nextFiles = [...currentFiles];
  const existingKeys = new Set(nextFiles.map(getFileKey));
  let optimizedCount = 0;

  for (const incomingFile of Array.from(fileList)) {
    const fileKey = getFileKey(incomingFile);
    if (existingKeys.has(fileKey)) continue;

    const rejection = getFileRejection(incomingFile);
    if (rejection) {
      toast.error(`${incomingFile.name}: ${rejection}`);
      continue;
    }
    if (nextFiles.length >= MAX_MEDIA_FILES) {
      toast.error(`${copy.maxImagesLabel} ${MAX_MEDIA_FILES}`);
      break;
    }

    const preparedFile = await normalizeUploadImage(incomingFile);
    if (preparedFile.size < incomingFile.size) optimizedCount++;
    nextFiles.push(preparedFile);
    existingKeys.add(fileKey);
  }

  if (optimizedCount > 0) toast.success(formatMessage(copy.optimized, { count: optimizedCount }));
  return nextFiles;
}

/** O rascunho de uma publicação do mural: texto, até quatro imagens e uma sondagem opcional. */
export function useComposer() {
  const [text, setText] = useState("");
  const { media, setFiles, removeFile, moveFile } = useMediaDraft();
  const files = media.map((entry) => entry.file);
  const poll = usePollDraft();

  // Ficheiros em sequência (não em paralelo) para respeitar o limite e a ordem escolhida.
  const addFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return;
      setFiles(await prepareFiles(files, fileList));
    },
    [files, setFiles],
  );

  const { reset: resetPoll } = poll;
  const reset = useCallback(() => {
    setText("");
    setFiles([]);
    resetPoll();
  }, [resetPoll, setFiles]);

  return {
    text,
    setText,
    files,
    previewUrls: media.map((entry) => entry.previewUrl),
    addFiles,
    removeFile,
    moveFile,
    poll,
    reset,
  };
}
