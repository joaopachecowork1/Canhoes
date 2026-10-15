"use client";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useMemo, useState } from "react";
import { CheckCircle2, Layers3, Trophy, User, XCircle } from "lucide-react";

import type { AdminNomineeDto, AwardCategoryDto } from "@/lib/api/types";
import { formatDateTimeUtc } from "../dateUtils";
import { AdminDrawer } from "../layout/AdminDrawer";
import { AdminStatusFilters } from "../layout/AdminStatusFilters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ADMIN_CONTENT_CARD_CLASS,
  ADMIN_SELECT_CONTENT_CLASS,
  ADMIN_SELECT_ITEM_CLASS,
  ADMIN_SELECT_TRIGGER_CLASS,
  AdminDetailPanel,
  AdminSelectableButton,
} from "../adminContentUi";
import { AdminStateMessage } from "../layout/AdminStateMessage";
import {
  NOMINATION_BADGE_VARIANT_BY_STATUS,
  NOMINATION_EMPTY_STATE_LABELS,
  NOMINATION_FILTERS,
  NOMINATION_STATUS_LABELS,
  countNominationStatuses,
  filterAndSortNominations,
  getCategoryName,
  type NominationListFilter,
  type NominationStatus,
} from "./nominationRules";

type AdminNominationsViewProps = Readonly<{
  categories: AwardCategoryDto[];
  nominations: AdminNomineeDto[];
  approveNomination: (nomineeId: string) => void;
  rejectNomination: (nomineeId: string, options?: { onSuccess?: () => void }) => void;
  setNominationCategory: (variables: { nomineeId: string; categoryId: string }) => void;
  isMutationPending: boolean;
}>;

function getNominationStatusIcon(status: NominationStatus) {
  switch (status) {
    case "approved":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "rejected":
      return <XCircle className="h-3.5 w-3.5" />;
    case "pending":
      return <Layers3 className="h-3.5 w-3.5" />;
  }
}

export function AdminNominationsView({
  categories,
  nominations,
  approveNomination,
  rejectNomination,
  setNominationCategory,
  isMutationPending,
}: AdminNominationsViewProps) {
  const [listRef] = useAutoAnimate();
  const [statusFilter, setStatusFilter] = useState<NominationListFilter>("pending");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [rejectingNominationId, setRejectingNominationId] = useState<string | null>(null);
  const [selectedNominationId, setSelectedNominationId] = useState<string | null>(null);

  const statusCounts = useMemo(() => countNominationStatuses(nominations), [nominations]);
  const filteredNominations = useMemo(
    () => filterAndSortNominations(nominations, statusFilter, categoryFilter),
    [categoryFilter, nominations, statusFilter]
  );
  const selectedNomination = filteredNominations.find(
    (nomination) => nomination.id === selectedNominationId
  );

  return (
    <div className="space-y-4">
      <Card className={ADMIN_CONTENT_CARD_CLASS}>
        <CardHeader className="space-y-2">
          <p className="editorial-kicker">Moderação</p>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Nomeações
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
            <AdminStatusFilters
              active={statusFilter}
              counts={{ all: nominations.length, ...statusCounts }}
              labels={NOMINATION_STATUS_LABELS}
              onChange={setStatusFilter}
              options={NOMINATION_FILTERS}
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className={ADMIN_SELECT_TRIGGER_CLASS}>
                <SelectValue placeholder="Filtrar categoria" />
              </SelectTrigger>
              <SelectContent className={ADMIN_SELECT_CONTENT_CLASS}>
                <SelectItem value="all" className={ADMIN_SELECT_ITEM_CLASS}>
                  Todas as categorias
                </SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id} className={ADMIN_SELECT_ITEM_CLASS}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredNominations.length === 0 ? (
            <AdminStateMessage variant="panel">
              {statusFilter === "all"
                ? "Sem nomeações neste filtro."
                : `Sem nomeações ${NOMINATION_EMPTY_STATE_LABELS[statusFilter]}.`}
            </AdminStateMessage>
          ) : (
            <div
              ref={listRef}
              className="max-h-[56svh] overflow-y-auto rounded-[var(--radius-md-token)] border border-[var(--border-subtle)] bg-[var(--bg-paper-soft)] p-2"
            >
              <div className="space-y-2">
                {filteredNominations.map((nomination) => {
                  const isSelected = nomination.id === selectedNominationId;
                  return (
                    <AdminSelectableButton
                      key={nomination.id}
                      type="button"
                      onClick={() => setSelectedNominationId(nomination.id)}
                      selected={isSelected}
                      aria-pressed={isSelected}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <p className="truncate text-sm font-semibold text-[var(--ink-primary)]">
                            {nomination.title}
                          </p>
                          <p className="truncate text-xs text-[var(--ink-muted)]">
                            {getCategoryName(nomination.categoryId, categories)}
                          </p>
                          <p className="text-[11px] text-[var(--ink-muted)]">
                            {formatDateTimeUtc(nomination.createdAtUtc)}
                          </p>
                        </div>
                        <NominationStatusBadge status={nomination.status} />
                      </div>
                    </AdminSelectableButton>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AdminDrawer
        open={Boolean(selectedNomination)}
        onOpenChange={(open) => !open && setSelectedNominationId(null)}
        title={selectedNomination?.title ?? ""}
        description={
          selectedNomination
            ? `Categoria atual: ${getCategoryName(selectedNomination.categoryId, categories)}`
            : undefined
        }
      >
        {selectedNomination ? (
          <>
            <AdminDetailPanel>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <p className="font-[var(--font-mono)] text-xs text-[var(--ink-muted)]">
                    {formatDateTimeUtc(selectedNomination.createdAtUtc)}
                  </p>
                  <p className="flex items-center gap-1.5 text-sm text-[var(--ink-primary)]">
                    <User className="h-3.5 w-3.5" />
                    Submetido por {selectedNomination.submittedByName}
                  </p>
                </div>
                <NominationStatusBadge status={selectedNomination.status} />
              </div>
            </AdminDetailPanel>

            <div className="space-y-2">
              <p className="text-xs font-medium text-[var(--ink-muted)]">Mover para categoria</p>
              <Select
                value={selectedNomination.categoryId ?? "none"}
                onValueChange={(categoryId) =>
                  setNominationCategory({ nomineeId: selectedNomination.id, categoryId })
                }
              >
                <SelectTrigger className={ADMIN_SELECT_TRIGGER_CLASS}>
                  <SelectValue placeholder="Mover para categoria" />
                </SelectTrigger>
                <SelectContent className={ADMIN_SELECT_CONTENT_CLASS}>
                  <SelectItem value="none" className={ADMIN_SELECT_ITEM_CLASS}>
                    Sem categoria
                  </SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id} className={ADMIN_SELECT_ITEM_CLASS}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                disabled={isMutationPending || selectedNomination.status === "approved"}
                className="min-h-11 border-[var(--border-neon)] bg-[rgba(0,255,136,0.12)] text-[var(--neon-green)] hover:bg-[rgba(0,255,136,0.18)]"
                onClick={() => approveNomination(selectedNomination.id)}
                aria-label={`Aprovar nomeação "${selectedNomination.title || selectedNomination.id}"`}
              >
                Aprovar
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isMutationPending || selectedNomination.status === "rejected"}
                className="min-h-11 border-[var(--neon-red)] bg-[rgba(255,58,58,0.08)] text-[var(--neon-red)]"
                onClick={() => setRejectingNominationId(selectedNomination.id)}
                aria-label={`Rejeitar nomeação "${selectedNomination.title || selectedNomination.id}"`}
              >
                Rejeitar
              </Button>
            </div>
          </>
        ) : null}
      </AdminDrawer>

      <AlertDialog
        open={Boolean(rejectingNominationId)}
        onOpenChange={(open) => !open && setRejectingNominationId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tens a certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação remove a nomeação da lista pública.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!rejectingNominationId) return;
                rejectNomination(rejectingNominationId, {
                  onSuccess: () => {
                    setRejectingNominationId(null);
                    setSelectedNominationId(null);
                  },
                });
              }}
            >
              Confirmar rejeição
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NominationStatusBadge({ status }: { status: AdminNomineeDto["status"] }) {
  return (
    <Badge
      variant={NOMINATION_BADGE_VARIANT_BY_STATUS[status]}
      className="inline-flex items-center gap-1 self-start"
    >
      {getNominationStatusIcon(status)}
      {status}
    </Badge>
  );
}
