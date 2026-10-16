"use client";

import { User } from "lucide-react";

import type { AdminNomineeDto, AwardCategoryDto } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";

import { AdminDetailPanel } from "../adminContentUi";
import { formatDateTimeUtc } from "../dateUtils";
import { AdminDrawer } from "../layout/AdminDrawer";
import { getCategoryName } from "./nominationRules";

const copy = messages.admin.AdminNominationsView;

function NominationDetails({
  categories,
  isMutationPending,
  nomination,
  onApprove,
  onMove,
  onReject,
}: Readonly<{
  categories: AwardCategoryDto[];
  isMutationPending: boolean;
  nomination: AdminNomineeDto;
  onApprove: () => void;
  onMove: (categoryId: string) => void;
  onReject: () => void;
}>) {
  const nominationName = nomination.title || nomination.id;

  return (
    <>
      <AdminDetailPanel>
        <div className="space-y-1">
          <p className="font-[var(--font-mono)] text-xs text-[var(--ink-muted)]">{formatDateTimeUtc(nomination.createdAtUtc)}</p>
          <p className="flex items-center gap-1.5 text-sm text-[var(--ink-primary)]">
            <User className="h-3.5 w-3.5" />
            {formatMessage(copy.submittedBy, { name: nomination.submittedByName })}
          </p>
        </div>
      </AdminDetailPanel>

      <div className="space-y-2">
        <p className="text-xs font-medium text-[var(--ink-muted)]">{copy.moveTo}</p>
        <Select value={nomination.categoryId ?? "none"} onValueChange={onMove}>
          <SelectTrigger>
            <SelectValue placeholder={copy.moveTo} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{copy.noCategory}</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          disabled={isMutationPending}
          className="min-h-11 border-[var(--border-neon)] bg-[rgba(0,255,136,0.12)] text-[var(--neon-green)] hover:bg-[rgba(0,255,136,0.18)]"
          onClick={onApprove}
          aria-label={formatMessage(copy.approveLabel, { name: nominationName })}
        >
          {messages.admin.ProposalReviewItem.approve}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={isMutationPending}
          className="min-h-11 border-[var(--neon-red)] bg-[rgba(255,58,58,0.08)] text-[var(--neon-red)]"
          onClick={onReject}
          aria-label={formatMessage(copy.rejectLabel, { name: nominationName })}
        >
          {messages.admin.ProposalReviewItem.reject}
        </Button>
      </div>
    </>
  );
}

/** One pending nomination: who sent it, move it to another category, approve or reject. */
export function NominationDrawer({
  categories,
  isMutationPending,
  nomination,
  onApprove,
  onClose,
  onMove,
  onReject,
}: Readonly<{
  categories: AwardCategoryDto[];
  isMutationPending: boolean;
  nomination: AdminNomineeDto | undefined;
  onApprove: (nomineeId: string) => void;
  onClose: () => void;
  onMove: (variables: { nomineeId: string; categoryId: string }) => void;
  onReject: (nomineeId: string) => void;
}>) {
  return (
    <AdminDrawer
      open={Boolean(nomination)}
      onOpenChange={(open) => !open && onClose()}
      title={nomination?.title ?? ""}
      description={nomination ? formatMessage(copy.currentCategory, { name: getCategoryName(nomination.categoryId, categories) }) : undefined}
    >
      {nomination ? (
        <NominationDetails
          categories={categories}
          isMutationPending={isMutationPending}
          nomination={nomination}
          onApprove={() => onApprove(nomination.id)}
          onMove={(categoryId) => onMove({ nomineeId: nomination.id, categoryId })}
          onReject={() => onReject(nomination.id)}
        />
      ) : null}
    </AdminDrawer>
  );
}
