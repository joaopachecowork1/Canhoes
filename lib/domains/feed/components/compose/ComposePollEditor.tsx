"use client";

import { BarChart3, PlusCircle, Trash2 } from "lucide-react";


import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import messages from "@/messages/pt.json";

type ComposePollEditorProps = {
  disabled: boolean;
  maxOptions: number;
  onAddOption: () => void;
  onOptionChange: (index: number, value: string) => void;
  onQuestionChange: (value: string) => void;
  onRemoveOption: (index: number) => void;
  options: string[];
  question: string;
};

export function ComposePollEditor({
  disabled,
  maxOptions,
  onAddOption,
  onOptionChange,
  onQuestionChange,
  onRemoveOption,
  options,
  question,
}: Readonly<ComposePollEditorProps>) {
  const composeCopy = messages.feed.compose;

  return (
    <section className="space-y-2.5 rounded-xl border border-[var(--color-veil)]/10 bg-[var(--bg-paper-soft)] p-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-[var(--text-primary)]">
        <BarChart3 className="h-4 w-4 text-[var(--color-fire)]" />
        {composeCopy.pollLabel}
      </div>

      <Textarea
        value={question}
        onChange={(event) => onQuestionChange(event.target.value)}
        placeholder={composeCopy.pollQuestionPlaceholder}
        className="min-h-14 resize-none"
        disabled={disabled}
      />

      <div className="space-y-2">
        {options.map((pollOption, index) => (
          <div key={`poll-${index}`} className="flex gap-2">
            <Input
              value={pollOption}
              onChange={(event) => onOptionChange(index, event.target.value)}
              placeholder={`${composeCopy.pollOptionPlaceholder} ${index + 1}`}
              disabled={disabled}
              className="min-w-0 flex-1"
            />

            {options.length > 2 ? (
              <button
                type="button"
                onClick={() => onRemoveOption(index)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-beige-dark)]/25 bg-transparent text-[var(--color-danger)]"
                aria-label={`${composeCopy.removeOption} ${index + 1}`}
                disabled={disabled}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ))}

        {options.length < maxOptions ? (
          <button
            type="button"
            onClick={onAddOption}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-semibold text-[var(--color-brown)]"
            disabled={disabled}
          >
            <PlusCircle className="h-4 w-4" />
            {composeCopy.addOption}
          </button>
        ) : null}
      </div>
    </section>
  );
}
