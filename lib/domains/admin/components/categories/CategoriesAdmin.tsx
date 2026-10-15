"use client";

import { useCallback, useEffect } from "react";
import { FolderTree, Pencil, Plus, Trash2 } from "lucide-react";

import type { AwardCategoryDto } from "@/lib/api/types";
import { logFrontendError } from "@/lib/errors";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { VirtualizedList } from "@/components/ui/virtualized-list";

import { useCategoriesAdmin } from "../hooks/useCategoriesAdmin";
import { AdminSectionSummary } from "../layout/AdminSectionSummary";
import { AdminStateMessage } from "../layout/AdminStateMessage";
import {
  ADMIN_CONTENT_CARD_CLASS,
  ADMIN_OUTLINE_BUTTON_CLASS,
  AdminDetailPanel,
} from "../adminContentUi";
import { AdminDrawer } from "../layout/AdminDrawer";
import { formatCount } from "@/lib/utils";
import {
  CATEGORY_KIND,
  CATEGORY_KIND_FORM_LABELS,
  CATEGORY_KIND_LABELS,
  type CategoryFormState,
  type CategorySheetState,
  type CategoryUsage,
} from "./categoryTypes";

type CategoriesAdminProps = {
  eventId: string | null;
  onUpdate: () => Promise<void>;
};

type CategoryFormPatch = Partial<CategoryFormState>;

const CATEGORY_ITEM_CLASS =
  "w-full min-h-11 rounded-[var(--radius-md-token)] border border-[var(--border-subtle)] bg-[var(--bg-paper)] px-4 py-3 text-left transition-colors hover:bg-[var(--bg-paper-soft)]";

function CategoryListItem({
  category,
  onEdit,
  usage,
}: Readonly<{
  category: AwardCategoryDto;
  onEdit: (category: AwardCategoryDto) => void;
  usage: CategoryUsage;
}>) {
  return (
    <button type="button" onClick={() => onEdit(category)} className={CATEGORY_ITEM_CLASS}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-[var(--ink-primary)]">{category.name}</p>
            <Badge variant="secondary">{CATEGORY_KIND_LABELS[category.kind]}</Badge>
            {category.isActive ? <Badge variant="default">Ativa</Badge> : <Badge variant="outline">Inativa</Badge>}
          </div>

          {category.description ? (
            <p className="text-sm leading-6 text-[var(--ink-muted)]">{category.description}</p>
          ) : (
            <p className="text-sm text-[var(--ink-muted)]">Sem descrição editorial definida.</p>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] uppercase tracking-[0.08em] text-[var(--ink-muted)]">
            <span>{formatCount(usage.nomineeCount, "nomeação", "nomeações")}</span>
            <span>{formatCount(usage.voteCount, "voto", "votos")}</span>
            {category.kind === CATEGORY_KIND.USER_VOTE && category.voteQuestion ? <span className="normal-case tracking-normal">{category.voteQuestion}</span> : null}
          </div>
        </div>

        <span className="mt-0.5 shrink-0 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-paper-soft)] p-2 text-[var(--ink-muted)]">
          <Pencil className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}

function CategoryList({
  categories,
  categoryUsageById,
  onEdit,
}: Readonly<{
  categories: AwardCategoryDto[];
  categoryUsageById: Record<string, CategoryUsage>;
  onEdit: (category: AwardCategoryDto) => void;
}>) {
  const renderItem = useCallback(
    (category: AwardCategoryDto) => (
      <CategoryListItem
        category={category}
        onEdit={onEdit}
        usage={categoryUsageById[category.id]}
      />
    ),
    [categoryUsageById, onEdit]
  );

  if (categories.length > 10) {
    return (
      <VirtualizedList
        items={categories}
        estimateSize={() => 88}
        getKey={(category) => category.id}
        className="max-h-[400px]"
        renderItem={renderItem}
      />
    );
  }

  return (
    <div className="space-y-2">
      {categories.map((category) => (
        <CategoryListItem
          key={category.id}
          category={category}
          onEdit={onEdit}
          usage={categoryUsageById[category.id]}
        />
      ))}
    </div>
  );
}

function CategoryEditorDrawer({
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
  onChange: (patch: CategoryFormPatch) => void;
  onDelete: () => void;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  sheetState: CategorySheetState | null;
}>) {
  const isCreateMode = sheetState?.mode === "create";
  const title = isCreateMode ? "Nova categoria" : form.name || "Editar categoria";
  const description = isCreateMode
    ? "Cria a categoria oficial sem sair do contexto mobile."
    : "Atualiza nome, tipo e estado da categoria selecionada.";

  return (
    <AdminDrawer
      open={Boolean(sheetState)}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
    >
      {sheetState ? (
        <>
          {!isCreateMode ? (
            <AdminDetailPanel className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {categoryUsage.nomineeCount} nomeaç{categoryUsage.nomineeCount === 1 ? "ão" : "ões"}
                </Badge>
                <Badge variant="secondary">
                  {categoryUsage.voteCount} voto{categoryUsage.voteCount === 1 ? "" : "s"}
                </Badge>
              </div>
              {categoryUsage.deleteReason ? (
                <p className="text-xs leading-5 text-[var(--text-muted)]">
                  {categoryUsage.deleteReason}
                </p>
              ) : (
                <p className="text-xs leading-5 text-[var(--text-muted)]">
                  Sem dependências conhecidas. O backend confirma o apagamento final.
                </p>
              )}
            </AdminDetailPanel>
          ) : null}

          <div className="space-y-2 pt-1">
            <Label htmlFor="category-name" className="text-[var(--ink-secondary)]">Nome</Label>
            <Input
              id="category-name"
              value={form.name}
              onChange={(event) => onChange({ name: event.target.value })}
              placeholder="Melhor categoria do ano"
              disabled={isBusy}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-description" className="text-[var(--ink-secondary)]">Descrição</Label>
            <Textarea
              id="category-description"
              value={form.description}
              onChange={(event) => onChange({ description: event.target.value })}
              placeholder="Resumo curto para contexto editorial."
              rows={3}
              disabled={isBusy}
            />
          </div>

          <div className="space-y-2">
              <Label className="text-[var(--ink-secondary)]">Como se vota</Label>
              <Select
                value={form.kind}
                onValueChange={(value: string) => onChange({ kind: value })}
                disabled={isBusy}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar tipo" />
                </SelectTrigger>
                <SelectContent className="z-[100]">
                  <SelectItem value={CATEGORY_KIND_FORM_LABELS.STICKER}>
                    {CATEGORY_KIND_LABELS[CATEGORY_KIND.STICKER]}
                  </SelectItem>
                  <SelectItem value={CATEGORY_KIND_FORM_LABELS.USER_VOTE}>
                    {CATEGORY_KIND_LABELS[CATEGORY_KIND.USER_VOTE]}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

          {form.kind === "UserVote" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-vote-question" className="text-[var(--ink-secondary)]">Pergunta de voto</Label>
                <Input
                  id="category-vote-question"
                  value={form.voteQuestion}
                  onChange={(event) => onChange({ voteQuestion: event.target.value })}
                  placeholder="Quem fechou o ano em alta?"
                  disabled={isBusy}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category-vote-rules" className="text-[var(--ink-secondary)]">Regras</Label>
                <Textarea
                  id="category-vote-rules"
                  value={form.voteRules}
                  onChange={(event) => onChange({ voteRules: event.target.value })}
                  placeholder="Notas internas para a votação oficial."
                  rows={4}
                  disabled={isBusy}
                />
              </div>
            </div>
          ) : null}

          {!isCreateMode ? (
            <AdminDetailPanel className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Categoria ativa</p>
                <p className="text-xs text-[var(--text-muted)]">
                  Desativa a categoria sem a apagar da auditoria.
                </p>
              </div>

              <Switch
                checked={form.isActive}
                onCheckedChange={(checked) => onChange({ isActive: checked })}
                disabled={isBusy}
              />
            </AdminDetailPanel>
          ) : null}

          <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-4">
            {!isCreateMode ? (
              categoryUsage.canDelete ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 border-[var(--color-danger)]/40 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10 sm:w-auto"
                  onClick={onDelete}
                  disabled={isBusy}
                >
                  <Trash2 className="h-4 w-4" />
                  Apagar categoria
                </Button>
              ) : (
                <p className="text-xs leading-5 text-[var(--text-muted)]">
                  Apagamento indisponível nesta categoria.
                </p>
              )
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isBusy}
                className="w-full border-[var(--border-subtle)] text-[var(--ink-secondary)] hover:bg-[var(--bg-paper)] sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={onSave}
                disabled={isBusy || form.name.trim().length === 0}
                className="w-full sm:w-auto"
              >
                {isCreateMode ? "Criar categoria" : "Guardar alterações"}
              </Button>
            </div>
          </div>
        </>
      ) : null}
    </AdminDrawer>
  );
}

/**
 * Coordinates the official category catalog. Data loading and mutations live
 * in the domain hook; this component owns the admin view composition.
 */
export function CategoriesAdmin({
  eventId,
  onUpdate,
}: Readonly<CategoriesAdminProps>) {
  const {
    queries,
    mutations,
    state,
    actions,
  } = useCategoriesAdmin(eventId, onUpdate);

  const {
    sortedCategories,
    categoryUsageById,
    sheetState,
    deleteTarget,
    form,
    isLoading,
    isBusy,
    queryError,
  } = state;

  const {
    patchForm,
    openCreateSheet,
    openEditSheet,
    handleSheetOpenChange,
    handleSave,
    setDeleteTarget,
    handleDelete,
  } = actions;

  const activeCategoriesCount = sortedCategories.filter((category) => category.isActive).length;
  const inactiveCategoriesCount = sortedCategories.length - activeCategoriesCount;
  const userVoteCategoriesCount = sortedCategories.filter(
    (category) => category.kind === CATEGORY_KIND.USER_VOTE
  ).length;

  const activeCategoryUsage =
    sheetState?.mode === "edit" && sheetState.category
      ? categoryUsageById[sheetState.category.id]
      : { canDelete: false, deleteReason: null, nomineeCount: 0, voteCount: 0 };

  useEffect(() => {
    if (queryError) {
      logFrontendError("CategoriesAdmin.query", queryError, { eventId });
    }
  }, [eventId, queryError]);

  if (!eventId) {
    return <AdminStateMessage>Falta uma edição ativa para gerir categorias.</AdminStateMessage>;
  }

  if (queryError) {
    return (
      <AdminStateMessage
        tone="error"
        action={
          <Button
            type="button"
            onClick={() => void Promise.all([
              queries.categories.refetch(),
              queries.nominationsSummary.refetch(),
              queries.votes.refetch(),
            ])}
            className={ADMIN_OUTLINE_BUTTON_CLASS}
          >
            Tentar novamente
          </Button>
        }
      >
        Não foi possível carregar as categorias.
      </AdminStateMessage>
    );
  }

  return (
    <div className="space-y-4">
      <AdminSectionSummary
        kicker="Estrutura"
        title="Categorias oficiais"
        description="CRUD compacto para manter a grelha oficial, sem misturar moderação ou auditoria nesta vista."
        items={[
          { label: "Categorias totais", value: sortedCategories.length },
          {
            label: "Ativas",
            tone: activeCategoriesCount > 0 ? "success" : "muted",
            value: activeCategoriesCount,
          },
          {
            label: "Inativas",
            tone: inactiveCategoriesCount > 0 ? "warning" : "muted",
            value: inactiveCategoriesCount,
          },
          { label: "Voto oficial", value: userVoteCategoriesCount },
        ]}
      />

      <Card className={ADMIN_CONTENT_CARD_CLASS}>
        <CardHeader className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="editorial-kicker">Categorias</p>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-4 w-4" />
                Catalogo oficial
              </CardTitle>
              <p className="text-sm text-[var(--ink-muted)]">
                Toca numa categoria para editar, rever dependências e ajustar o estado sem sair do contexto admin.
              </p>
            </div>

            <Button type="button" onClick={openCreateSheet} className="min-h-11 gap-2 sm:self-start" disabled={isBusy}><Plus className="h-4 w-4" /> Nova categoria</Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {isLoading ? <AdminStateMessage>A carregar categorias...</AdminStateMessage> : null}

          {!isLoading && sortedCategories.length === 0 ? (
            <AdminStateMessage variant="panel">
              Ainda não existem categorias oficiais nesta edição.
            </AdminStateMessage>
          ) : null}

          {!isLoading && sortedCategories.length > 0 ? (
            <CategoryList
              categories={sortedCategories}
              categoryUsageById={categoryUsageById}
              onEdit={openEditSheet}
            />
          ) : null}
        </CardContent>
      </Card>

      <CategoryEditorDrawer
        categoryUsage={activeCategoryUsage}
        form={form}
        isBusy={isBusy}
        onChange={patchForm}
        onDelete={() => {
          if (sheetState?.mode !== "edit" || !sheetState.category) return;
          setDeleteTarget(sheetState.category);
        }}
        onOpenChange={handleSheetOpenChange}
        onSave={handleSave}
        sheetState={sheetState}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Esta ação remove "${deleteTarget.name}" da edição atual.`
                : "Esta ação remove a categoria oficial da edição atual."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutations.delete.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={mutations.delete.isPending} onClick={handleDelete}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
