"use client";

import { Pencil } from "lucide-react";

import type { AwardCategoryDto } from "@/lib/api/types";
import { Badge } from "@/components/ui/badge";
import { formatCount } from "@/lib/utils";
import messages from "@/messages/pt.json";

import { CATEGORY_KIND, CATEGORY_KIND_LABELS, type CategoryUsage } from "./categoryTypes";

const copy = messages.admin.CategoryListItem;
const CATEGORY_ITEM_CLASS =
  "w-full min-h-11 rounded-[var(--radius-md-token)] border border-[var(--border-subtle)] bg-[var(--bg-paper)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-paper-soft)]";

/** One category in the admin catalog; tapping it opens the editor. */
export function CategoryListItem({
  category,
  onEdit,
  usage,
}: Readonly<{ category: AwardCategoryDto; onEdit: (category: AwardCategoryDto) => void; usage: CategoryUsage }>) {
  return (
    <button type="button" onClick={() => onEdit(category)} className={CATEGORY_ITEM_CLASS}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-[var(--ink-primary)]">{category.name}</p>
            <Badge variant="secondary">{CATEGORY_KIND_LABELS[category.kind]}</Badge>
            {category.isActive ? (
              <Badge variant="default">{messages.categories.CanhoesCategoriesModule.active}</Badge>
            ) : (
              <Badge variant="outline">{messages.categories.CanhoesCategoriesModule.inactive}</Badge>
            )}
          </div>

          <p className="text-sm leading-6 text-[var(--ink-muted)]">{category.description || copy.noDescription}</p>

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
            <span>{formatCount(usage.nomineeCount, copy.nominee, copy.nominees)}</span>
            <span>{formatCount(usage.voteCount, messages.common.vote, messages.common.votes)}</span>
            {category.kind === CATEGORY_KIND.USER_VOTE && category.voteQuestion ? (
              <span className="normal-case tracking-normal">{category.voteQuestion}</span>
            ) : null}
          </div>
        </div>

        <span className="mt-0.5 shrink-0 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-paper-soft)] p-2 text-[var(--ink-muted)]">
          <Pencil className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}
