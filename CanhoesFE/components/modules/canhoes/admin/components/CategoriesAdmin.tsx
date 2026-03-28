"use client";

import { useMemo, useState } from "react";
import { FolderTree, ScrollText } from "lucide-react";
import { toast } from "sonner";

import type {
  AwardCategoryDto,
  CategoryProposalDto,
  MeasureProposalDto,
} from "@/lib/api/types";
import { canhoesRepo } from "@/lib/repositories/canhoesRepo";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type Props = {
  categories: AwardCategoryDto[];
  categoryProposals: CategoryProposalDto[];
  measureProposals: MeasureProposalDto[];
  loading: boolean;
  onUpdate: () => void;
};

type Draft = {
  id: string;
  name: string;
  sortOrder: string;
  kind: string;
  isActive: boolean;
};

type ProposalStatus = "pending" | "approved" | "rejected";
type ProposalSummary = Record<ProposalStatus, number>;

function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function summarizeStatuses(items: unknown): ProposalSummary {
  return ensureArray<{ status: string }>(items).reduce<ProposalSummary>(
    (summary, item) => {
      if (item.status === "pending") summary.pending += 1;
      if (item.status === "approved") summary.approved += 1;
      if (item.status === "rejected") summary.rejected += 1;
      return summary;
    },
    { pending: 0, approved: 0, rejected: 0 }
  );
}

function statusBadgeVariant(status: string): "default" | "destructive" | "secondary" {
  if (status === "approved") return "default";
  if (status === "rejected") return "destructive";
  return "secondary";
}

export function CategoriesAdmin({
  categories,
  categoryProposals,
  measureProposals,
  loading,
  onUpdate,
}: Readonly<Props>) {
  const [isCreating, setIsCreating] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryKind, setNewCategoryKind] = useState<"Sticker" | "UserVote">(
    "Sticker"
  );
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category] as const)),
    [categories]
  );

  const rows = useMemo(
    () =>
      categories
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((category) => {
          const draft = drafts[category.id];
          return (
            draft ?? {
              id: category.id,
              name: category.name,
              sortOrder: String(category.sortOrder),
              kind: category.kind,
              isActive: category.isActive,
            }
          );
        }),
    [categories, drafts]
  );

  const categoryProposalList = useMemo(
    () => ensureArray<CategoryProposalDto>(categoryProposals),
    [categoryProposals]
  );

  const proposalSummary = useMemo(
    () => ({
      categories: summarizeStatuses(categoryProposals),
      measures: summarizeStatuses(measureProposals),
    }),
    [categoryProposals, measureProposals]
  );

  const setDraft = (categoryId: string, patch: Partial<Draft>) => {
    setDrafts((currentDrafts) => {
      const sourceCategory = categoriesById.get(categoryId);
      const baseDraft = currentDrafts[categoryId] ?? {
        id: categoryId,
        name: sourceCategory?.name ?? "",
        sortOrder: String(sourceCategory?.sortOrder ?? 0),
        kind: sourceCategory?.kind ?? "Sticker",
        isActive: sourceCategory?.isActive ?? true,
      };

      return {
        ...currentDrafts,
        [categoryId]: { ...baseDraft, ...patch },
      };
    });
  };

  const saveCategory = async (categoryId: string) => {
    const draft = drafts[categoryId];
    if (!draft) return;

    const parsedSortOrder = Number(draft.sortOrder);
    if (!Number.isFinite(parsedSortOrder)) {
      toast.error("Sort order invalido");
      return;
    }

    try {
      await canhoesRepo.adminUpdateCategory(categoryId, {
        name: draft.name.trim(),
        sortOrder: parsedSortOrder,
        isActive: draft.isActive,
        kind: draft.kind,
      });

      setDrafts((currentDrafts) => {
        const remainingDrafts = { ...currentDrafts };
        delete remainingDrafts[categoryId];
        return remainingDrafts;
      });

      toast.success("Categoria atualizada");
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao guardar categoria");
    }
  };

  const createCategory = async () => {
    const normalizedName = newCategoryName.trim();
    if (!normalizedName) return;

    setIsCreating(true);
    try {
      await canhoesRepo.adminCreateCategory({
        name: normalizedName,
        sortOrder: null,
        kind: newCategoryKind,
      });
      setNewCategoryName("");
      toast.success("Categoria criada");
      onUpdate();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar categoria");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-[var(--color-moss)]/20">
        <CardHeader className="space-y-1">
          <p className="editorial-kicker">Curadoria</p>
          <CardTitle>Criar categoria</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
            <Input
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
              placeholder="Ex: Melhor frase de grupo"
            />

            <Select
              value={newCategoryKind}
              onValueChange={(value) =>
                setNewCategoryKind(value as "Sticker" | "UserVote")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Sticker">Sticker</SelectItem>
                <SelectItem value="UserVote">Votar num utilizador</SelectItem>
              </SelectContent>
            </Select>

            <Button
              type="button"
              className="w-full lg:w-auto"
              onClick={() => void createCategory()}
              disabled={isCreating || !newCategoryName.trim()}
            >
              Criar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-[var(--color-moss)]/20">
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="editorial-kicker">Gestao</p>
              <CardTitle>Categorias existentes</CardTitle>
            </div>
            <Badge variant="outline">{categories.length}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {rows.map((row) => (
            <article
              key={row.id}
              className="editorial-shell rounded-[var(--radius-md-token)] px-4 py-4"
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_110px_220px_auto]">
                <div className="space-y-2">
                  <label className="editorial-kicker flex items-center gap-2">
                    <FolderTree className="h-3.5 w-3.5" />
                    Nome
                  </label>
                  <Input
                    value={row.name}
                    onChange={(event) =>
                      setDraft(row.id, { name: event.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="editorial-kicker">Ordem</label>
                  <Input
                    value={row.sortOrder}
                    onChange={(event) =>
                      setDraft(row.id, { sortOrder: event.target.value })
                    }
                    inputMode="numeric"
                  />
                </div>

                <div className="space-y-2">
                  <label className="editorial-kicker">Tipo</label>
                  <Select
                    value={row.kind}
                    onValueChange={(value) => setDraft(row.id, { kind: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sticker">Sticker</SelectItem>
                      <SelectItem value="UserVote">Votar num utilizador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-3 lg:justify-end">
                  <div className="flex items-center justify-between rounded-[var(--radius-md-token)] border border-[var(--color-beige-dark)]/20 bg-[var(--color-bg-surface)] px-3 py-2">
                    <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                      Ativa
                    </span>
                    <Switch
                      checked={row.isActive}
                      onCheckedChange={(checked) =>
                        setDraft(row.id, { isActive: checked })
                      }
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={() => void saveCategory(row.id)}
                    disabled={loading}
                  >
                    Guardar
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </CardContent>
      </Card>

      <Card className="border-[var(--color-moss)]/20">
        <CardHeader className="space-y-1">
          <p className="editorial-kicker">Historico</p>
          <CardTitle>Propostas recebidas</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              Categorias pendentes: {proposalSummary.categories.pending}
            </Badge>
            <Badge variant="outline">
              Categorias aprovadas: {proposalSummary.categories.approved}
            </Badge>
            <Badge variant="outline">
              Categorias rejeitadas: {proposalSummary.categories.rejected}
            </Badge>
            <Badge variant="secondary">
              Medidas pendentes: {proposalSummary.measures.pending}
            </Badge>
            <Badge variant="outline">
              Medidas aprovadas: {proposalSummary.measures.approved}
            </Badge>
            <Badge variant="outline">
              Medidas rejeitadas: {proposalSummary.measures.rejected}
            </Badge>
          </div>

          <div className="space-y-3">
            {categoryProposalList.slice(0, 30).map((proposal) => (
              <article
                key={proposal.id}
                className="editorial-shell rounded-[var(--radius-md-token)] px-4 py-4"
              >
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 text-[var(--color-title)]">
                      <ScrollText className="h-4 w-4" />
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {proposal.name}
                      </span>
                    </div>

                    <Badge variant={statusBadgeVariant(proposal.status)}>
                      {proposal.status}
                    </Badge>
                  </div>

                  {proposal.description ? (
                    <p className="body-small text-[var(--color-text-secondary)]">
                      {proposal.description}
                    </p>
                  ) : null}

                  <p className="text-xs text-[var(--color-text-muted)]">
                    {new Date(proposal.createdAtUtc).toLocaleString("pt-PT")}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
