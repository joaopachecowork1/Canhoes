"use client";

import { useState } from "react";
import { Award, ChevronDown, ChevronUp, Medal } from "lucide-react";

import type { AdminCategoryResultDto } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { formatMessage } from "@/lib/messages";
import { cn, formatCount } from "@/lib/utils";
import messages from "@/messages/pt.json";

import { AdminDetailPanel } from "./adminContentUi";
import { AdminDrawer } from "./layout/AdminDrawer";

const copy = messages.admin.AdminOfficialResultsSection;

type AdminCategoryNomineeResult = {
  nomineeId: string;
  title: string;
  imageUrl: string | null;
  voteCount: number;
  voterNames: string[];
};

function getParticipationClass(rate: number) {
  if (rate < 0.5) return "text-[var(--person-coral)]";
  if (rate < 0.8) return "text-[var(--person-amber)]";
  return "text-[var(--moss-glow)]";
}

function getRankMeta(index: number) {
  if (index === 0) {
    return {
      fillClass: "bg-[var(--person-amber)]",
      iconClassName: "text-[var(--person-amber)]",
      Icon: Award,
    };
  }

  if (index === 1) {
    return {
      fillClass: "bg-[var(--text-muted)]",
      iconClassName: "text-[var(--ink-muted)]",
      Icon: Medal,
    };
  }

  if (index === 2) {
    return {
      fillClass: "bg-[var(--color-text-muted)]",
      iconClassName: "text-[var(--color-text-muted)]",
      Icon: Medal,
    };
  }

  return {
    fillClass: "bg-[var(--color-text-muted)]",
    iconClassName: "text-[var(--ink-muted)]",
    Icon: null,
  };
}

function ResultsNomineeBar({
  nominee,
  index,
  totalVotes,
}: Readonly<{
  nominee: AdminCategoryNomineeResult;
  index: number;
  totalVotes: number;
}>) {
  const { fillClass, iconClassName, Icon } = getRankMeta(index);
  const percentage = totalVotes > 0 ? Math.round((nominee.voteCount / totalVotes) * 100) : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {Icon ? <Icon className={cn("h-4 w-4 shrink-0", iconClassName)} /> : null}
          <p className="truncate text-base text-[var(--ink-primary)]">{nominee.title}</p>
        </div>
        <span className="text-xs text-[var(--ink-secondary)]">{`${formatCount(nominee.voteCount, messages.common.vote, messages.common.votes)} (${percentage}%)`}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--bg-paper-soft)]">
        <div className={cn("h-full", fillClass)} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

function ResultsVotersList({
  nominees,
}: Readonly<{
  nominees: AdminCategoryNomineeResult[];
}>) {
  return (
    <AdminDetailPanel className="max-h-[34svh] space-y-1 overflow-y-auto">
      {nominees.map((nominee) => (
        <p key={nominee.nomineeId} className="text-xs text-[var(--ink-secondary)]">
          <span className="text-[var(--ink-primary)]">{nominee.title}</span>
          {`: ${nominee.voterNames.join(", ") || copy.noVotes}`}
        </p>
      ))}
    </AdminDetailPanel>
  );
}

const toPercent = (rate: number) => Math.round(rate * 100);

/** Mounted per category (keyed by its id), so the voters list starts hidden for each one. */
function ResultsCategoryDetails({ category }: Readonly<{ category: AdminCategoryResultDto }>) {
  const [isVotersVisible, setIsVotersVisible] = useState(false);
  const sortedNominees = [...category.nominees].sort((left, right) => right.voteCount - left.voteCount);
  const ToggleIcon = isVotersVisible ? ChevronUp : ChevronDown;

  return (
    <>
      <AdminDetailPanel className={cn(getParticipationClass(category.participationRate), "bg-[var(--bg-paper-soft)]")}>
        {formatMessage(copy.participation, { percent: toPercent(category.participationRate) })}
      </AdminDetailPanel>

      <div className="space-y-2">
        {sortedNominees.map((nominee, index) => (
          <ResultsNomineeBar key={nominee.nomineeId} nominee={nominee} index={index} totalVotes={category.totalVotes} />
        ))}
      </div>

      <Button type="button" variant="outline" className="w-full justify-center" onClick={() => setIsVotersVisible((current) => !current)}>
        <ToggleIcon className="mr-2 h-4 w-4" />
        {copy.showVoters}
      </Button>

      {isVotersVisible ? <ResultsVotersList nominees={sortedNominees} /> : null}
    </>
  );
}

export function ResultsCategoryDrawer({
  category,
  memberCount,
  onClose,
}: Readonly<{ category: AdminCategoryResultDto | null; memberCount: number; onClose: () => void }>) {
  return (
    <AdminDrawer
      open={Boolean(category)}
      onOpenChange={(open) => !open && onClose()}
      title={category?.categoryName ?? ""}
      description={
        category
          ? formatMessage(copy.drawerDescription, { votes: category.totalVotes, members: memberCount, percent: toPercent(category.participationRate) })
          : undefined
      }
    >
      {category ? <ResultsCategoryDetails key={category.categoryId} category={category} /> : null}
    </AdminDrawer>
  );
}
