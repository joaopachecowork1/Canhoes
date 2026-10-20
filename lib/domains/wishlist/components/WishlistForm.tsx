"use client";

import { CanhoesFileTrigger } from "@/lib/domains/event/components/CanhoesFileTrigger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WishlistFormState } from "../hooks/useCanhoesWishlist";
import messages from "@/messages/pt.json";

const copy = messages.wishlist.WishlistForm;

type WishlistFormProps = {
  formState: WishlistFormState;
  isSaving: boolean;
  canSubmit: boolean;
  onChange: (update: Partial<WishlistFormState>) => void;
  onSubmit: () => void;
};

/** Form to add an item (title, link, notes, image) to your wishlist. */
export function WishlistForm({ formState, isSaving, canSubmit, onChange, onSubmit }: WishlistFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="wishlist-title-input">{copy.titleLabel}</label>
          <Input
            id="wishlist-title-input"
            value={formState.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder={copy.titlePlaceholder}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="wishlist-url-input">{copy.urlLabel}</label>
          <Input
            id="wishlist-url-input"
            value={formState.url}
            onChange={(event) => onChange({ url: event.target.value })}
            placeholder={copy.urlPlaceholder}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="wishlist-notes-input">{copy.notesLabel}</label>
        <Textarea
          id="wishlist-notes-input"
          value={formState.notes}
          onChange={(event) => onChange({ notes: event.target.value })}
          placeholder={copy.notesPlaceholder}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CanhoesFileTrigger
          accept="image/png,image/jpeg"
          fileName={formState.selectedFile?.name}
          onChange={(file) => onChange({ selectedFile: file })}
          placeholder={copy.imagePlaceholder}
        />

        <Button disabled={!canSubmit || isSaving} onClick={onSubmit} aria-label={copy.submitLabel}>
          {isSaving ? messages.common.saving : copy.submit}
        </Button>
      </div>
    </div>
  );
}
