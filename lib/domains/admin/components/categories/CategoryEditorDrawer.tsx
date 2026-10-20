"use client";

import { Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { formatCount } from "@/lib/utils";
import messages from "@/messages/pt.json";

import { AdminDetailPanel } from "../adminContentUi";
import { AdminDrawer } from "../layout/AdminDrawer";
import { CategoryFormFields } from "./CategoryFormFields";
import type { CategoryFormState, CategorySheetState, CategoryUsage } from "./categoryTypes";

const copy = messages.admin.CategoryEditorDrawer;
const HINT_CLASS = "text-xs leading-5 text-[var(--text-muted)]";

function CategoryUsagePanel({ usage }: Readonly<{ usage: CategoryUsage }>) {
  return (
    <AdminDetailPanel className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {formatCount(
            usage.nomineeCount,
            messages.admin.CategoryListItem.nominee,
            messages.admin.CategoryListItem.nominees,
          )}
        </Badge>
        <Badge variant="secondary">{formatCount(usage.voteCount, messages.common.vote, messages.common.votes)}</Badge>
      </div>
      <p className={HINT_CLASS}>{usage.deleteReason ?? copy.noDependencies}</p>
    </AdminDetailPanel>
  );
}

function ActiveToggle({
  isActive,
  isBusy,
  onChange,
}: Readonly<{ isActive: boolean; isBusy: boolean; onChange: (isActive: boolean) => void }>) {
  return (
    <AdminDetailPanel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{copy.activeTitle}</p>
        <p className="text-xs text-[var(--text-muted)]">{copy.activeHint}</p>
      </div>
      <Switch checked={isActive} onCheckedChange={onChange} disabled={isBusy} />
    </AdminDetailPanel>
  );
}

function DeleteAction({
  canDelete,
  isBusy,
  onDelete,
}: Readonly<{ canDelete: boolean; isBusy: boolean; onDelete: () => void }>) {
  if (!canDelete) return <p className={HINT_CLASS}>{copy.deleteUnavailable}</p>;
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full gap-2 border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 sm:w-auto"
      onClick={onDelete}
      disabled={isBusy}
    >
      <Trash2 className="h-4 w-4" />
      {copy.delete}
    </Button>
  );
}

function DrawerFooter({
  canDelete,
  canSave,
  isBusy,
  isEditMode,
  onCancel,
  onDelete,
  onSave,
}: Readonly<{
  canDelete: boolean;
  canSave: boolean;
  isBusy: boolean;
  isEditMode: boolean;
  onCancel: () => void;
  onDelete: () => void;
  onSave: () => void;
}>) {
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-4">
      {isEditMode ? <DeleteAction canDelete={canDelete} isBusy={isBusy} onDelete={onDelete} /> : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isBusy}
          className="w-full border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:bg-[var(--bg-paper)] sm:w-auto"
        >
          {messages.common.cancel}
        </Button>
        <Button type="button" onClick={onSave} disabled={isBusy || !canSave} className="w-full sm:w-auto">
          {isEditMode ? copy.save : copy.create}
        </Button>
      </div>
    </div>
  );
}

/** Drawer to create a category or edit one (with its usage, active switch and delete). */
export function CategoryEditorDrawer({
  categoryUsage,
  form,
  isBusy,
  onChange,
  onDelete,
  onOpenChange,
  onSave,
  sheetState,
}: Readonly<{
  categoryUsage: CategoryUsage;
  form: CategoryFormState;
  isBusy: boolean;
  onChange: (patch: Partial<CategoryFormState>) => void;
  onDelete: () => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  sheetState: CategorySheetState | null;
}>) {
  const isEditMode = sheetState?.mode === "edit";

  return (
    <AdminDrawer
      open={Boolean(sheetState)}
      onOpenChange={onOpenChange}
      title={isEditMode ? form.name || copy.editTitle : copy.createTitle}
      description={isEditMode ? copy.editDescription : copy.createDescription}
    >
      {sheetState ? (
        <>
          {isEditMode ? <CategoryUsagePanel usage={categoryUsage} /> : null}
          <CategoryFormFields form={form} isBusy={isBusy} onChange={onChange} />
          {isEditMode ? (
            <ActiveToggle isActive={form.isActive} isBusy={isBusy} onChange={(isActive) => onChange({ isActive })} />
          ) : null}

          <DrawerFooter
            canDelete={categoryUsage.canDelete}
            canSave={form.name.trim().length > 0}
            isBusy={isBusy}
            isEditMode={isEditMode}
            onCancel={() => onOpenChange(false)}
            onDelete={onDelete}
            onSave={onSave}
          />
        </>
      ) : null}
    </AdminDrawer>
  );
}
