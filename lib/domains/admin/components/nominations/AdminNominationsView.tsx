"use client";

import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";

import type { AdminNomineeDto, AwardCategoryDto } from "@/lib/api/types";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import messages from "@/messages/pt.json";

import { ADMIN_CONTENT_CARD_CLASS, AdminSelectableButton } from "../adminContentUi";
import { formatDateTimeUtc } from "../dateUtils";
import { AdminStateMessage } from "../layout/AdminStateMessage";
import { NominationDrawer } from "./NominationDrawer";
import { filterAndSortNominations, getCategoryName } from "./nominationRules";

const copy = messages.admin.AdminNominationsView;

type AdminNominationsViewProps = Readonly<{
  categories: AwardCategoryDto[];
  nominations: AdminNomineeDto[];
  approveNomination: (nomineeId: string) => void;
  rejectNomination: (nomineeId: string, options?: { onSuccess?: () => void }) => void;
  setNominationCategory: (variables: { nomineeId: string; categoryId: string }) => void;
  isMutationPending: boolean;
}>;

function CategoryFilter({ categories, onChange, value }: Readonly<{ categories: AwardCategoryDto[]; onChange: (value: string) => void; value: string }>) {
  return (
    <div className="lg:w-64">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={copy.filterPlaceholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{copy.allCategories}</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category.id} value={category.id}>
              {category.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function NominationList({
  categories,
  nominations,
  onSelect,
  selectedId,
}: Readonly<{ categories: AwardCategoryDto[]; nominations: AdminNomineeDto[]; onSelect: (id: string) => void; selectedId: string | null }>) {
  return (
    <div className="max-h-[56svh] overflow-y-auto rounded-[var(--radius-md-token)] border border-[var(--border-subtle)] bg-[var(--bg-paper-soft)] p-2">
      <div className="space-y-2">
        {nominations.map((nomination) => {
          const isSelected = nomination.id === selectedId;
          return (
            <AdminSelectableButton key={nomination.id} type="button" onClick={() => onSelect(nomination.id)} selected={isSelected} aria-pressed={isSelected}>
              <div className="min-w-0 space-y-1">
                <p className="truncate text-base font-semibold text-[var(--ink-primary)]">{nomination.title}</p>
                <p className="truncate text-xs text-[var(--ink-muted)]">{getCategoryName(nomination.categoryId, categories)}</p>
                <p className="text-xs text-[var(--ink-muted)]">{formatDateTimeUtc(nomination.createdAtUtc)}</p>
              </div>
            </AdminSelectableButton>
          );
        })}
      </div>
    </div>
  );
}

function RejectNominationDialog({ isOpen, onCancel, onConfirm }: Readonly<{ isOpen: boolean; onCancel: () => void; onConfirm: () => void }>) {
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.rejectTitle}</AlertDialogTitle>
          <AlertDialogDescription>{copy.rejectDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{messages.common.cancel}</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{copy.rejectConfirm}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AdminNominationsView({
  categories,
  nominations,
  approveNomination,
  rejectNomination,
  setNominationCategory,
  isMutationPending,
}: AdminNominationsViewProps) {
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [rejectingNominationId, setRejectingNominationId] = useState<string | null>(null);
  const [selectedNominationId, setSelectedNominationId] = useState<string | null>(null);

  const filteredNominations = useMemo(() => filterAndSortNominations(nominations, categoryFilter), [categoryFilter, nominations]);
  const selectedNomination = filteredNominations.find((nomination) => nomination.id === selectedNominationId);

  const handleConfirmReject = () => {
    if (!rejectingNominationId) return;
    rejectNomination(rejectingNominationId, {
      onSuccess: () => {
        setRejectingNominationId(null);
        setSelectedNominationId(null);
      },
    });
  };

  return (
    <div className="space-y-4">
      <Card className={ADMIN_CONTENT_CARD_CLASS}>
        <CardHeader className="space-y-2">
          <p>{messages.admin.PendingProposals.kicker}</p>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            {copy.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <CategoryFilter categories={categories} onChange={setCategoryFilter} value={categoryFilter} />
          {filteredNominations.length === 0 ? (
            <AdminStateMessage variant="panel">{categoryFilter === "all" ? copy.empty : copy.emptyInCategory}</AdminStateMessage>
          ) : (
            <NominationList categories={categories} nominations={filteredNominations} onSelect={setSelectedNominationId} selectedId={selectedNominationId} />
          )}
        </CardContent>
      </Card>

      <NominationDrawer
        categories={categories}
        isMutationPending={isMutationPending}
        nomination={selectedNomination}
        onApprove={approveNomination}
        onClose={() => setSelectedNominationId(null)}
        onMove={setNominationCategory}
        onReject={setRejectingNominationId}
      />

      <RejectNominationDialog isOpen={Boolean(rejectingNominationId)} onCancel={() => setRejectingNominationId(null)} onConfirm={handleConfirmReject} />
    </div>
  );
}
