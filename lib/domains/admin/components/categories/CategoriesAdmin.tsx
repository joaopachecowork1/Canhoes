"use client";

import { useEffect } from "react";
import { FolderTree, Plus } from "lucide-react";

import type { AwardCategoryDto } from "@/lib/api/types";
import { logFrontendError } from "@/lib/errors";
import { formatMessage } from "@/lib/messages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import messages from "@/messages/pt.json";

import { useCategoriesAdmin } from "../../hooks/useCategoriesAdmin";
import { ADMIN_CONTENT_CARD_CLASS } from "../adminContentUi";
import { AdminStateMessage } from "../layout/AdminStateMessage";
import { CategoryDeleteDialog } from "./CategoryDeleteDialog";
import { CategoryEditorDrawer } from "./CategoryEditorDrawer";
import { CategoryListItem } from "./CategoryListItem";
import { CATEGORY_KIND } from "@/lib/categoryKind";

import { type CategoryUsage } from "./categoryTypes";

const copy = messages.admin.CategoriesAdmin;
const NO_USAGE: CategoryUsage = { canDelete: false, deleteReason: null, nomineeCount: 0, voteCount: 0 };

// o nome do tipo coincide com o do componente, mas vive só no espaço dos tipos
type CategoriesAdmin = ReturnType<typeof useCategoriesAdmin>;

/** Resumo do catálogo: quantas categorias ativas, inativas e de voto em membros. */
function getCatalogSummary(categories: AwardCategoryDto[]) {
  const active = categories.filter((category) => category.isActive).length;
  const userVote = categories.filter((category) => category.kind === CATEGORY_KIND.USER_VOTE).length;
  return formatMessage(copy.summary, { active, inactive: categories.length - active, userVote });
}

/** Cartão com o catálogo de categorias e o botão para criar uma nova. */
function CategoryCatalog({ admin }: Readonly<{ admin: CategoriesAdmin }>) {
  const { sortedCategories, isLoading } = admin;

  return (
    <Card className={ADMIN_CONTENT_CARD_CLASS}>
      <CardHeader className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              {copy.title}
            </CardTitle>
            <p className="text-sm text-[var(--ink-muted)]">{copy.description}</p>
            <p className="text-sm text-[var(--ink-secondary)]">{getCatalogSummary(sortedCategories)}</p>
          </div>

          <Button
            type="button"
            onClick={admin.openCreateSheet}
            className="min-h-11 gap-2 sm:self-start"
            disabled={admin.mutations.isBusy}
          >
            <Plus className="h-4 w-4" /> {copy.newCategory}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading ? <AdminStateMessage>{copy.loading}</AdminStateMessage> : null}
        {!isLoading && sortedCategories.length === 0 ? (
          <AdminStateMessage variant="panel">{copy.empty}</AdminStateMessage>
        ) : null}
        {!isLoading && sortedCategories.length > 0 ? (
          <div className="space-y-2">
            {sortedCategories.map((category) => (
              <CategoryListItem
                key={category.id}
                category={category}
                onEdit={admin.openEditSheet}
                usage={admin.categoryUsageById[category.id]}
              />
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Coordena o catálogo oficial de categorias. O carregamento de dados e as escritas vivem
 * no hook do domínio; este componente só compõe a vista de admin.
 */
export function CategoriesAdmin({
  eventId,
  onUpdate,
}: Readonly<{ eventId: string | null; onUpdate: () => Promise<void> }>) {
  const admin = useCategoriesAdmin(eventId, onUpdate);
  const { sheetState, queryError } = admin;
  // categoria aberta no editor (só no modo de edição)
  const editedCategory = sheetState?.mode === "edit" ? sheetState.category : null;

  useEffect(() => {
    if (queryError) logFrontendError("CategoriesAdmin.query", queryError, { eventId });
  }, [eventId, queryError]);

  if (!eventId) return <AdminStateMessage>{copy.noEvent}</AdminStateMessage>;

  if (queryError) {
    return (
      <AdminStateMessage
        tone="error"
        action={
          <Button type="button" onClick={() => void admin.refetchAll()}>
            {messages.common.retry}
          </Button>
        }
      >
        {copy.loadError}
      </AdminStateMessage>
    );
  }

  return (
    <div className="space-y-4">
      <CategoryCatalog admin={admin} />

      <CategoryEditorDrawer
        categoryUsage={editedCategory ? admin.categoryUsageById[editedCategory.id] : NO_USAGE}
        form={admin.form}
        isBusy={admin.mutations.isBusy}
        onChange={admin.patchForm}
        onDelete={() => {
          if (editedCategory) admin.setDeleteTarget(editedCategory);
        }}
        onOpenChange={admin.handleSheetOpenChange}
        onSave={admin.handleSave}
        sheetState={sheetState}
      />

      <CategoryDeleteDialog
        isPending={admin.mutations.delete.isPending}
        onCancel={() => admin.setDeleteTarget(null)}
        onConfirm={admin.handleDelete}
        target={admin.deleteTarget}
      />
    </div>
  );
}
