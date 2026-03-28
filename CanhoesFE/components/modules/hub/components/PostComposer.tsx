"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  ImagePlus,
  Loader2,
  PlusCircle,
  ScrollText,
  Send,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface PostComposerSubmitData {
  text: string;
  files: File[];
  pollOn: boolean;
  pollQuestion: string;
  pollOptions: string[];
}

interface PostComposerProps {
  onSubmit: (data: PostComposerSubmitData) => Promise<void>;
}

const MAX_MEDIA_FILES = 10;
const MAX_POLL_OPTIONS = 6;

export function PostComposer({ onSubmit }: Readonly<PostComposerProps>) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [pollOn, setPollOn] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrls = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files]
  );

  useEffect(() => {
    return () => {
      previewUrls.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
    };
  }, [previewUrls]);

  const resetComposer = useCallback(() => {
    setText("");
    setFiles([]);
    setPollOn(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
  }, []);

  const handleSubmit = async () => {
    if (isSubmitting || !text.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        files,
        pollOn,
        pollOptions,
        pollQuestion,
        text,
      });
      resetComposer();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;

    setFiles((currentFiles) =>
      [...currentFiles, ...Array.from(fileList)].slice(0, MAX_MEDIA_FILES)
    );

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (fileIndex: number) => {
    setFiles((currentFiles) =>
      currentFiles.filter((_, currentIndex) => currentIndex !== fileIndex)
    );
  };

  const updatePollOption = (optionIndex: number, value: string) => {
    setPollOptions((currentOptions) =>
      currentOptions.map((option, currentIndex) =>
        currentIndex === optionIndex ? value : option
      )
    );
  };

  const addPollOption = () => {
    if (pollOptions.length < MAX_POLL_OPTIONS) {
      setPollOptions((currentOptions) => [...currentOptions, ""]);
    }
  };

  const removePollOption = (optionIndex: number) => {
    if (pollOptions.length > 2) {
      setPollOptions((currentOptions) =>
        currentOptions.filter((_, currentIndex) => currentIndex !== optionIndex)
      );
    }
  };

  return (
    <section className="editorial-shell rounded-[var(--radius-lg-token)] px-4 py-4 sm:px-5 sm:py-5">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[var(--color-title)]">
              <ScrollText className="h-4 w-4" />
              <span className="editorial-kicker">Novo registo</span>
            </div>
            <div className="space-y-1">
              <h3 className="heading-3 text-[var(--color-text-primary)]">
                Publicar no arquivo do grupo
              </h3>
              <p className="body-small text-[var(--color-text-muted)]">
                Texto, imagens e votacoes no mesmo bloco, com prioridades claras
                para mobile.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant={files.length > 0 ? "secondary" : "outline"}
              size="sm"
              className="gap-2 rounded-full px-4"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSubmitting}
            >
              <ImagePlus className="h-4 w-4" />
              Imagens
              {files.length > 0 ? <span>{files.length}</span> : null}
            </Button>

            <Button
              type="button"
              variant={pollOn ? "secondary" : "outline"}
              size="sm"
              className="gap-2 rounded-full px-4"
              onClick={() => setPollOn((currentValue) => !currentValue)}
              disabled={isSubmitting}
            >
              <BarChart3 className="h-4 w-4" />
              Votacao
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <label
            htmlFor="hub-post-text"
            className="editorial-kicker block text-[var(--color-text-muted)]"
          >
            Texto do post
          </label>
          <Textarea
            id="hub-post-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Escreve uma nota, um teaser da gala ou uma atualizacao para o grupo."
            className="min-h-[132px] resize-none bg-[var(--color-bg-surface)]"
          />
        </div>

        {files.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="editorial-kicker text-[var(--color-text-muted)]">
                Media selecionada
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {files.length}/{MAX_MEDIA_FILES}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {files.map((file, fileIndex) => (
                <div
                  key={`${file.name}-${file.size}-${fileIndex}`}
                  className="relative overflow-hidden rounded-[var(--radius-md-token)] border border-[var(--color-beige-dark)]/25 bg-[var(--color-bg-surface)]"
                >
                  <div className="aspect-square">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrls[fileIndex]}
                      alt={file.name}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFile(fileIndex)}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(36,25,20,0.78)] text-[var(--color-bg-card)] shadow-sm transition-transform active:scale-95"
                    aria-label="Remover imagem"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {pollOn ? (
          <section className="rounded-[var(--radius-lg-token)] border border-[var(--color-moss)]/15 bg-[var(--color-bg-surface)] p-4 sm:p-5">
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="editorial-kicker">Votacao</p>
                <h4 className="heading-3 text-[var(--color-text-primary)]">
                  Adicionar pergunta e opcoes
                </h4>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="hub-poll-question"
                  className="editorial-kicker text-[var(--color-text-muted)]"
                >
                  Pergunta
                </label>
                <Textarea
                  id="hub-poll-question"
                  value={pollQuestion}
                  onChange={(event) => setPollQuestion(event.target.value)}
                  placeholder="Ex: Qual foi o momento mais caotico deste mes?"
                  className="min-h-[88px] resize-none bg-[var(--color-bg-card)]"
                />
              </div>

              <div className="space-y-2">
                <p className="editorial-kicker text-[var(--color-text-muted)]">
                  Opcoes
                </p>
                <div className="space-y-2">
                  {pollOptions.map((option, optionIndex) => (
                    <div
                      key={`poll-option-${optionIndex}`}
                      className="flex items-center gap-2"
                    >
                      <Input
                        value={option}
                        onChange={(event) =>
                          updatePollOption(optionIndex, event.target.value)
                        }
                        placeholder={`Opcao ${optionIndex + 1}`}
                        className="bg-[var(--color-bg-card)]"
                      />

                      {pollOptions.length > 2 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="shrink-0 text-[var(--color-danger)]"
                          onClick={() => removePollOption(optionIndex)}
                          aria-label={`Remover opcao ${optionIndex + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>

                {pollOptions.length < MAX_POLL_OPTIONS ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-start gap-2 px-0 text-[var(--color-brown)]"
                    onClick={addPollOption}
                  >
                    <PlusCircle className="h-4 w-4" />
                    Adicionar opcao
                  </Button>
                ) : null}
              </div>
            </div>
          </section>
        ) : null}

        <div className="editorial-divider" />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="body-small text-[var(--color-text-muted)]">
            Mantem o texto curto e visual. O feed funciona melhor com blocos
            claros e media bem enquadrada.
          </p>

          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !text.trim()}
            className={cn(
              "w-full gap-2 sm:w-auto sm:min-w-[150px]",
              isSubmitting && "cursor-wait"
            )}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Publicar
          </Button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />
    </section>
  );
}
