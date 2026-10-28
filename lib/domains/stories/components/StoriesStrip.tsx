"use client";

import { useRef, type ChangeEvent } from "react";
import { Loader2, Plus } from "lucide-react";

import { PersonCromo } from "@/components/ui/person-cromo";
import type { StoryAuthorDto } from "@/lib/api/types";
import { formatMessage } from "@/lib/messages";
import { personColorVar } from "@/lib/personColors";
import messages from "@/messages/pt.json";

import type { StripItem } from "../rules/storyStrip";

const copy = messages.stories.StoriesStrip;
const ITEM_CLASS = "flex w-[4.5rem] shrink-0 flex-col items-center gap-1";
const CAPTION_CLASS = "w-full truncate text-center text-base text-[var(--color-text-secondary)]";

/** O botão de publicar uma story: abre o seletor de ficheiros e fica parado enquanto uma publicação está a correr. */
function PublishButton({
  isPublishing,
  onPublish,
}: Readonly<{ isPublishing: boolean; onPublish: (file: File) => void }>) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Limpa o campo para se poder escolher a mesma imagem outra vez.
    event.target.value = "";
    if (file) onPublish(file);
  };

  return (
    <li className={ITEM_CLASS}>
      {/* O mesmo respiro (p-1) dos cromos, para o botão ficar alinhado com eles. */}
      <span className="p-1">
        <button
          type="button"
          aria-label={copy.addLabel}
          disabled={isPublishing}
          onClick={() => inputRef.current?.click()}
          className="flex size-16 items-center justify-center rounded-xl border-2 border-dashed border-[var(--color-text-secondary)] text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-veil)]/8 disabled:opacity-60"
        >
          {isPublishing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
        </button>
      </span>
      <span className={CAPTION_CLASS}>{isPublishing ? copy.publishing : copy.addCaption}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        tabIndex={-1}
        aria-hidden="true"
        className="hidden"
        onChange={handleChange}
      />
    </li>
  );
}

/** Um membro com stories ativas: o cromo com um anel na sua cor, que abre o visualizador. */
function StoryAuthorButton({ item, onOpen }: Readonly<{ item: StripItem; onOpen: () => void }>) {
  return (
    <button
      type="button"
      aria-label={formatMessage(copy.viewLabel, { name: item.name })}
      onClick={onOpen}
      className="flex w-full flex-col items-center gap-1"
    >
      <span className="rounded-[1.25rem] p-1" style={{ boxShadow: `0 0 0 3px ${personColorVar(item.color)}` }}>
        <PersonCromo name={item.name} color={item.color} size="lg" />
      </span>
      <span className={CAPTION_CLASS}>{item.name}</span>
    </button>
  );
}

/** A faixa do mural: publicar a minha story e todo o grupo; quem tem stories leva um anel e abre o visualizador. */
export function StoriesStrip({
  items,
  isPublishing,
  onPublish,
  onOpen,
}: Readonly<{
  items: StripItem[];
  isPublishing: boolean;
  onPublish: (file: File) => void;
  onOpen: (group: StoryAuthorDto) => void;
}>) {
  return (
    <section aria-label={copy.label}>
      <ul
        aria-label={copy.listLabel}
        tabIndex={0}
        className="flex gap-3 overflow-x-auto px-1 py-1 [scrollbar-width:none]"
      >
        <PublishButton isPublishing={isPublishing} onPublish={onPublish} />
        {items.map((item) => {
          const { group } = item;
          return (
            <li key={item.userId} className={ITEM_CLASS}>
              {group ? (
                <StoryAuthorButton item={item} onOpen={() => onOpen(group)} />
              ) : (
                <>
                  <span className="p-1">
                    <PersonCromo name={item.name} color={item.color} size="lg" />
                  </span>
                  <span className={CAPTION_CLASS}>{item.name}</span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
