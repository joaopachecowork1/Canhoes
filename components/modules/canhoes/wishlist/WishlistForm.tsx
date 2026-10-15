"use client";

import {
  CanhoesFileTrigger,
} from "@/components/modules/canhoes/CanhoesModuleParts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WishlistFormState } from "./useCanhoesWishlist";

type WishlistFormProps = {
  formState: WishlistFormState;
  isSaving: boolean;
  canSubmit: boolean;
  onChange: (update: Partial<WishlistFormState>) => void;
  onSubmit: () => void;
};

export function WishlistForm({
  formState,
  isSaving,
  canSubmit,
  onChange,
  onSubmit,
}: WishlistFormProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Adicionar item à tua wishlist</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="wishlist-title-input" className="canhoes-field-label">Título</label>
            <Input
              id="wishlist-title-input"
              value={formState.title}
              onChange={(event) => onChange({ title: event.target.value })}
              placeholder="Ex.: Mouse sem fios"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="wishlist-url-input" className="canhoes-field-label">URL</label>
            <Input
              id="wishlist-url-input"
              value={formState.url}
              onChange={(event) => onChange({ url: event.target.value })}
              placeholder="URL opcional"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="wishlist-notes-input" className="canhoes-field-label">Notas</label>
          <Textarea
            id="wishlist-notes-input"
            value={formState.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
            placeholder="Notas opcionais"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CanhoesFileTrigger
            accept="image/png,image/jpeg"
            fileName={formState.selectedFile?.name}
            onChange={(file) => onChange({ selectedFile: file })}
            placeholder="Adicionar imagem (opcional)"
          />

          <Button disabled={!canSubmit || isSaving} onClick={onSubmit} aria-label="Adicionar item">
            {isSaving ? "A guardar..." : "Adicionar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
