"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";

import { isAcceptedImage, MAX_FILE_BYTES, MAX_FILE_MB, normalizeUploadImage } from "../components/compose/composeUpload";
import { getFileKey, MAX_MEDIA_FILES, MAX_POLL_OPTIONS, MIN_POLL_OPTIONS, moveItem } from "../rules/composeRules";

const copy = messages.feed.compose;
const EMPTY_POLL_OPTIONS = ["", ""];

type MediaDraft = { file: File; previewUrl: string };

const revoke = (media: MediaDraft[]) => media.forEach(({ previewUrl }) => URL.revokeObjectURL(previewUrl));

/**
 * The picked images with their preview URLs. A URL is created when its file is added and
 * revoked when it is removed, on reset and on unmount, so no effect has to keep them in sync.
 */
function useMediaDraft() {
  const [media, setMedia] = useState<MediaDraft[]>([]);
  // The handlers read and write this, never the render, so URLs are made and revoked once each.
  const mediaRef = useRef<MediaDraft[]>([]);

  useEffect(() => () => revoke(mediaRef.current), []);

  const commit = useCallback((next: MediaDraft[]) => {
    revoke(mediaRef.current.filter((entry) => !next.includes(entry)));
    mediaRef.current = next;
    setMedia(next);
  }, []);

  /** Takes the new full list of files, keeping the URLs of files already there. */
  const setFiles = useCallback(
    (files: File[]) =>
      commit(files.map((file) => mediaRef.current.find((entry) => entry.file === file) ?? { file, previewUrl: URL.createObjectURL(file) })),
    [commit]
  );
  const removeFile = useCallback(
    (index: number) => commit(mediaRef.current.filter((_, currentIndex) => currentIndex !== index)),
    [commit]
  );
  const moveFile = useCallback(
    (index: number, direction: -1 | 1) => commit(moveItem(mediaRef.current, index, direction)),
    [commit]
  );

  return { media, setFiles, removeFile, moveFile };
}

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
      current.length > MIN_POLL_OPTIONS ? current.filter((_, currentIndex) => currentIndex !== index) : current
    );
  }, []);

  const reset = useCallback(() => {
    setIsEnabled(false);
    setQuestion("");
    setOptions(EMPTY_POLL_OPTIONS);
  }, []);

  return { isEnabled, setIsEnabled, question, setQuestion, options, changeOption, addOption, removeOption, reset };
}

/** Why an incoming file is refused, or null when it may be added. */
function getFileRejection(file: File) {
  if (!isAcceptedImage(file)) return copy.unsupportedFormat;
  if (file.size > MAX_FILE_BYTES) return `${copy.fileTooLargeLabel} ${MAX_FILE_MB}MB`;
  return null;
}

/**
 * Adds picked images to `currentFiles`: skips duplicates and unsupported or oversized files (with
 * a toast), stops at the limit and shrinks large photos for a quicker upload.
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

/** The draft of a mural post: text, up to four images and an optional poll. */
export function useComposer() {
  const [text, setText] = useState("");
  const { media, setFiles, removeFile, moveFile } = useMediaDraft();
  const files = media.map((entry) => entry.file);
  const poll = usePollDraft();

  const addFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return;
      setFiles(await prepareFiles(files, fileList));
    },
    [files, setFiles]
  );

  const { reset: resetPoll } = poll;
  const reset = useCallback(() => {
    setText("");
    setFiles([]);
    resetPoll();
  }, [resetPoll, setFiles]);

  return { text, setText, files, previewUrls: media.map((entry) => entry.previewUrl), addFiles, removeFile, moveFile, poll, reset };
}
