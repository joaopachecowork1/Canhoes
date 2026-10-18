"use client";

import { CheckCircle2, Clock } from "lucide-react";
import type { QueryClient } from "@tanstack/react-query";

import type { AwardCategoryDto, MyNominationDto, NomineeDto } from "@/lib/api/types";
import { CanhoesFeatureCard } from "@/lib/domains/event/components/CanhoesFeatureCard";
import { CanhoesFileTrigger } from "@/lib/domains/event/components/CanhoesFileTrigger";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMessage } from "@/lib/messages";
import { formatCount } from "@/lib/utils";
import messages from "@/messages/pt.json";

import { NOMINATION_TITLE_MAX, NOMINATION_TITLE_MIN, useSubmitNomination } from "../hooks/useSubmitNomination";

const copy = messages.voting.CategoryNominationCard;

export function NominationsLoadingState() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <Skeleton className="h-10 w-full rounded-[var(--radius-md-token)]" />
        <Skeleton className="h-10 w-36 rounded-full" />
      </div>
      <div className="space-y-2 rounded-[var(--radius-lg-token)] border border-[rgba(255,255,255,0.12)] bg-[rgba(22,28,15,0.72)] p-4">
        <Skeleton className="h-4 w-40 rounded" />
        <Skeleton className="h-3 w-56 rounded" />
        <div className="space-y-2 pt-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full rounded-[var(--radius-md-token)]" />
          ))}
        </div>
      </div>
    </div>
  );
}

type CategoryNominationCardProps = Readonly<{
  category: AwardCategoryDto;
  eventId: string;
  myNomination: MyNominationDto | undefined;
  approvedNominees: NomineeDto[];
  isPhaseOpen: boolean;
  onNominationSubmitted: () => Promise<void>;
  queryClient: QueryClient;
}>;

function PendingNomination({ label }: Readonly<{ label: string | null }>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge className="border border-[var(--neon-amber)] bg-[rgba(255,184,0,0.08)] text-[var(--neon-amber)]">
        <Clock className="mr-1 h-3.5 w-3.5" />
        {copy.pending}
      </Badge>
      <span className="text-sm font-medium text-[var(--ink-primary)]">{label || copy.alreadyNominated}</span>
    </div>
  );
}

function NominationForm({ isPhaseOpen, nomination }: Readonly<{ isPhaseOpen: boolean; nomination: ReturnType<typeof useSubmitNomination> }>) {
  const { title, setTitle, file, setFile, titleTrimmed, isValidTitle, mutation } = nomination;

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <div className="space-y-2">
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={copy.titlePlaceholder}
          className="border-[var(--border-moss)] focus-visible:border-[var(--border-neon)]"
          maxLength={NOMINATION_TITLE_MAX}
          disabled={!isPhaseOpen || mutation.isPending}
        />
        <div className="flex items-center justify-between text-xs text-[var(--ink-muted)]">
          <span>{formatMessage(copy.lengthHint, { min: NOMINATION_TITLE_MIN, max: NOMINATION_TITLE_MAX })}</span>
          <span className="font-[var(--font-mono)]">{`${titleTrimmed.length}/${NOMINATION_TITLE_MAX}`}</span>
        </div>
        <CanhoesFileTrigger fileName={file?.name} onChange={setFile} placeholder={messages.wishlist.WishlistForm.imagePlaceholder} />
      </div>
      <Button
        type="button"
        onClick={() => mutation.mutate(titleTrimmed)}
        disabled={!isPhaseOpen || !isValidTitle || mutation.isPending}
        className="min-w-36"
        variant="default"
      >
        {mutation.isPending ? copy.submitting : copy.submit}
      </Button>
    </div>
  );
}

export function CategoryNominationCard({
  category,
  eventId,
  myNomination,
  approvedNominees,
  isPhaseOpen,
  onNominationSubmitted,
  queryClient,
}: CategoryNominationCardProps) {
  const nomination = useSubmitNomination({ categoryId: category.id, eventId, onNominationSubmitted, queryClient });
  const hasSubmittedNomination = Boolean(myNomination || nomination.pendingLabel);

  return (
    <CanhoesFeatureCard title={category.name} description={category.description ?? undefined} variant="official">
      {hasSubmittedNomination ? (
        <PendingNomination label={nomination.pendingLabel ?? myNomination?.nomineeTitle ?? null} />
      ) : (
        <NominationForm isPhaseOpen={isPhaseOpen} nomination={nomination} />
      )}
      <ApprovedNomineesList nominees={approvedNominees} />
    </CanhoesFeatureCard>
  );
}

function ApprovedNomineesList({ nominees }: Readonly<{ nominees: NomineeDto[] }>) {
  return (
    <div className="space-y-2 pt-1">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-[var(--ink-primary)]">{copy.approvedTitle}</h4>
        <span className="font-[var(--font-mono)] text-xs text-[var(--ink-muted)]">{formatCount(nominees.length, copy.approvedOne, copy.approvedOther)}</span>
      </div>
      {nominees.length === 0 ? (
        <p className="text-sm text-[var(--ink-muted)]">{copy.noApproved}</p>
      ) : (
        <div className="space-y-2">
          {nominees.map((nominee) => (
            <div key={nominee.id} className="flex items-center gap-2 rounded-[var(--radius-md-token)] border border-[rgba(255,255,255,0.1)] px-3 py-2.5 transition-colors duration-150 hover:border-[rgba(122,173,58,0.2)]">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--neon-green)]" />
              <span className="truncate text-sm font-medium text-[var(--ink-primary)]">{nominee.title}</span>
            </div>))}
        </div>
      )}
    </div>
  );
}
