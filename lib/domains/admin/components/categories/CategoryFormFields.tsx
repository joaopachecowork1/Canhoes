"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import messages from "@/messages/pt.json";

import { CATEGORY_KIND } from "@/lib/categoryKind";

import { CATEGORY_KIND_FORM_LABELS, CATEGORY_KIND_LABELS, type CategoryFormState } from "./categoryTypes";

const copy = messages.admin.CategoryFormFields;
const LABEL_CLASS = "text-[var(--ink-secondary)]";

type FieldsProps = Readonly<{
  form: CategoryFormState;
  isBusy: boolean;
  onChange: (patch: Partial<CategoryFormState>) => void;
}>;

/** Pergunta e regras de voto, só para categorias votadas em membros. */
function UserVoteFields({ form, isBusy, onChange }: FieldsProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="category-vote-question" className={LABEL_CLASS}>
          {copy.voteQuestionLabel}
        </Label>
        <Input
          id="category-vote-question"
          value={form.voteQuestion}
          onChange={(event) => onChange({ voteQuestion: event.target.value })}
          placeholder={copy.voteQuestionPlaceholder}
          disabled={isBusy}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category-vote-rules" className={LABEL_CLASS}>
          {copy.voteRulesLabel}
        </Label>
        <Textarea
          id="category-vote-rules"
          value={form.voteRules}
          onChange={(event) => onChange({ voteRules: event.target.value })}
          placeholder={copy.voteRulesPlaceholder}
          rows={4}
          disabled={isBusy}
        />
      </div>
    </div>
  );
}

/** Nome, descrição e tipo de uma categoria (e, no voto em membros, pergunta e regras). */
export function CategoryFormFields({ form, isBusy, onChange }: FieldsProps) {
  return (
    <>
      <div className="space-y-2 pt-1">
        <Label htmlFor="category-name" className={LABEL_CLASS}>
          {copy.nameLabel}
        </Label>
        <Input
          id="category-name"
          value={form.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder={copy.namePlaceholder}
          disabled={isBusy}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category-description" className={LABEL_CLASS}>
          {copy.descriptionLabel}
        </Label>
        <Textarea
          id="category-description"
          value={form.description}
          onChange={(event) => onChange({ description: event.target.value })}
          placeholder={copy.descriptionPlaceholder}
          rows={3}
          disabled={isBusy}
        />
      </div>

      <div className="space-y-2">
        <Label className={LABEL_CLASS}>{messages.categories.CategoryProposalForm.kindLabel}</Label>
        <Select value={form.kind} onValueChange={(value: string) => onChange({ kind: value })} disabled={isBusy}>
          <SelectTrigger aria-label={messages.categories.CategoryProposalForm.kindLabel}>
            <SelectValue placeholder={copy.kindPlaceholder} />
          </SelectTrigger>
          <SelectContent className="z-[100]">
            <SelectItem value={CATEGORY_KIND_FORM_LABELS.STICKER}>
              {CATEGORY_KIND_LABELS[CATEGORY_KIND.NOMINEE]}
            </SelectItem>
            <SelectItem value={CATEGORY_KIND_FORM_LABELS.USER_VOTE}>
              {CATEGORY_KIND_LABELS[CATEGORY_KIND.USER_VOTE]}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {form.kind === CATEGORY_KIND_FORM_LABELS.USER_VOTE ? (
        <UserVoteFields form={form} isBusy={isBusy} onChange={onChange} />
      ) : null}
    </>
  );
}
