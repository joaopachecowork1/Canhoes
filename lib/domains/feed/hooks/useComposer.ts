"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";

import { isAcceptedImage, MAX_FILE_BYTES, MAX_FILE_MB, normalizeUploadImage } from "../components/compose/composeUpload";
import { getFileKey, MAX_MEDIA_FILES, MAX_POLL_OPTIONS, MIN_POLL_OPTIONS, moveItem } from "../rules/composeRules";

const copy = messages.feed.compose;
const EMPTY_POLL_OPTIONS = ["", ""];

/** Object URLs for the picked images, revoked when the files change. */
function usePreviewUrls(files: File[]) {
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    if (files.length === 0) {
      setPreviewUrls((currentUrls) => (currentUrls.length === 0 ? currentUrls : []));
      return;
    }

    const nextUrls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(nextUrls);
    return () => nextUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  return previewUrls;
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
  const [files, setFiles] = useState<File[]>([]);
  const previewUrls = usePreviewUrls(files);
  const poll = usePollDraft();

  const addFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList) return;
      setFiles(await prepareFiles(files, fileList));
    },
    [files]
  );

  const removeFile = useCallback((index: number) => {
    setFiles((currentFiles) => currentFiles.filter((_, currentIndex) => currentIndex !== index));
  }, []);

  const moveFile = useCallback((index: number, direction: -1 | 1) => {
    setFiles((currentFiles) => moveItem(currentFiles, index, direction));
  }, []);

  const { reset: resetPoll } = poll;
  const reset = useCallback(() => {
    setText("");
    setFiles([]);
    resetPoll();
  }, [resetPoll]);

  return { text, setText, files, previewUrls, addFiles, removeFile, moveFile, poll, reset };
}
