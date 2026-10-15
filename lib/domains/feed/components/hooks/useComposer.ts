"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const MAX_MEDIA_FILES = 4;
export const MAX_POLL_OPTIONS = 6;

export function useComposer() {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPollEnabled, setIsPollEnabled] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    if (files.length === 0) {
      setPreviewUrls((currentUrls) => (currentUrls.length === 0 ? currentUrls : []));
      return;
    }

    const nextUrls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(nextUrls);

    return () => {
      nextUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  const reset = useCallback(() => {
    setText("");
    setFiles([]);
    setIsPollEnabled(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
  }, []);

  const handleFiles = useCallback((fileList: FileList | null) => {
    if (!fileList) return;

    setFiles((currentFiles) =>
      [...currentFiles, ...Array.from(fileList)].slice(0, MAX_MEDIA_FILES)
    );

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((currentFiles) =>
      currentFiles.filter((_, currentIndex) => currentIndex !== index)
    );
  }, []);

  const handlePollOptionChange = useCallback((index: number, value: string) => {
    setPollOptions((currentOptions) =>
      currentOptions.map((option, currentIndex) => (currentIndex === index ? value : option))
    );
  }, []);

  const addPollOption = useCallback(() => {
    setPollOptions((currentOptions) =>
      currentOptions.length < MAX_POLL_OPTIONS ? [...currentOptions, ""] : currentOptions
    );
  }, []);

  const removePollOption = useCallback((index: number) => {
    setPollOptions((currentOptions) =>
      currentOptions.length > 2
        ? currentOptions.filter((_, currentIndex) => currentIndex !== index)
        : currentOptions
    );
  }, []);

  return {
    state: {
      text,
      files,
      previewUrls,
      isSubmitting,
      isPollEnabled,
      pollQuestion,
      pollOptions,
    },
    actions: {
      setText,
      setFiles,
      setIsSubmitting,
      setIsPollEnabled,
      setPollQuestion,
      setPollOptions,
      handleFiles,
      removeFile,
      handlePollOptionChange,
      addPollOption,
      removePollOption,
      reset,
    },
    refs: {
      fileInputRef,
    },
  };
}
