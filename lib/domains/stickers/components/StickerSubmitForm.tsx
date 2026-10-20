"use client";

import type { AwardCategoryDto } from "@/lib/api/types";
import { CanhoesFileTrigger } from "@/lib/domains/event/components/CanhoesFileTrigger";
import { CanhoesMediaThumb } from "@/lib/domains/event/components/CanhoesMediaThumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import messages from "@/messages/pt.json";

import type { useStickerSubmission } from "../hooks/useStickers";

const copy = messages.stickers.StickerSubmitForm;

/** Category, title and image of a new sticker, with a preview of the image. */
export function StickerSubmitForm({
  categories,
  onSubmit,
  submission,
}: Readonly<{ categories: AwardCategoryDto[]; onSubmit: () => void; submission: ReturnType<typeof useStickerSubmission> }>) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <span id="sticker-category-label">{copy.categoryLabel}</span>
          <Select value={submission.categoryId} onValueChange={submission.setCategoryId}>
            <SelectTrigger aria-labelledby="sticker-category-label">
              <SelectValue placeholder={copy.categoryPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label htmlFor="sticker-title-input">{copy.titleLabel}</label>
          <Input
            id="sticker-title-input"
            value={submission.title}
            onChange={(event) => submission.setTitle(event.target.value)}
            placeholder={copy.titlePlaceholder}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
        <div className="space-y-3">
          <p>{copy.imageLabel}</p>
          <CanhoesFileTrigger
            className="gap-3 rounded-[var(--radius-md-token)] border-[var(--border-subtle)] bg-[var(--bg-surface)] shadow-[var(--shadow-panel)]"
            fileName={submission.file?.name}
            iconClassName="text-[var(--person-teal)]"
            onChange={submission.handleFileChange}
            placeholder={messages.wishlist.WishlistForm.imagePlaceholder}
          />
          <p>{copy.pendingHint}</p>
        </div>

        {submission.previewUrl ? (
          <div className="rounded-[var(--radius-md-token)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 shadow-[var(--shadow-panel)]">
            <CanhoesMediaThumb
              alt={submission.file?.name ?? copy.previewAlt}
              src={submission.previewUrl}
              normalizeSrc={false}
              frameClassName="aspect-square h-auto w-full rounded-[calc(var(--radius-md-token)-4px)] bg-[var(--color-bg-surface)]"
              imageClassName="h-full w-full object-cover"
              iconClassName="h-6 w-6"
            />
          </div>
        ) : null}
      </div>

      <div className="flex sm:justify-end">
        <Button
          type="button"
          variant="default"
          disabled={!submission.canSubmit}
          onClick={onSubmit}
          className="w-full sm:w-auto"
        >
          {submission.isSubmitting ? copy.submitting : copy.submit}
        </Button>
      </div>
    </>
  );
}
