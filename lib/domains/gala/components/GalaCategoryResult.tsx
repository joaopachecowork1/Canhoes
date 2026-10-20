"use client";

import { Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicCategoryResultDto } from "@/lib/api/types";
import { CanhoesMediaThumb } from "@/lib/domains/event/components/CanhoesMediaThumb";
import { formatMessage } from "@/lib/messages";
import { formatCount } from "@/lib/utils";
import messages from "@/messages/pt.json";

const copy = messages.gala.CanhoesGalaModule;

type RankedNominee = PublicCategoryResultDto["top"][number];

/** "1 voto" / "4 votos". */
export const formatVotes = (count: number) => formatCount(count, messages.common.vote, messages.common.votes);

/** The nominee's picture; without one there is no frame at all, since an empty frame reads as a failed load. */
function WinnerPicture({ nominee }: Readonly<{ nominee: RankedNominee }>) {
  if (!nominee.imageUrl) return null;
  return <CanhoesMediaThumb alt={nominee.title} src={nominee.imageUrl} frameClassName="size-20 rounded-2xl" />;
}

/** The category's winner, large and in gold, with the whole name on as many lines as it needs. */
function WinnerBlock({ nominee }: Readonly<{ nominee: RankedNominee }>) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-canhoes-gold/50 bg-canhoes-gold/10 p-3">
      <WinnerPicture nominee={nominee} />
      <div className="min-w-0 flex-1 space-y-1">
        <p className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-[0.06em] text-canhoes-gold">
          <Trophy className="size-4" aria-hidden />
          {copy.winner}
        </p>
        <h3 className="break-words font-[family-name:var(--font-display)] text-2xl font-bold leading-tight text-[var(--ink-primary)]">{nominee.title}</h3>
        <p className="text-base text-[var(--ink-secondary)]">{formatVotes(nominee.voteCount)}</p>
      </div>
    </div>
  );
}

function RunnerUpRow({ nominee, place }: Readonly<{ nominee: RankedNominee; place: number }>) {
  return (
    <li className="flex items-baseline gap-3 px-1 text-base text-[var(--ink-secondary)]">
      <span className="w-8 shrink-0 font-[family-name:var(--font-display)] font-bold text-[var(--ink-primary)]">{formatMessage(copy.place, { position: place })}</span>
      <span className="min-w-0 flex-1 break-words">{nominee.title}</span>
      <span className="shrink-0 text-sm">{formatVotes(nominee.voteCount)}</span>
    </li>
  );
}

/** One category's result: the winner first and the next places underneath, smaller. */
export function GalaCategoryResult({ categoryResult }: Readonly<{ categoryResult: PublicCategoryResultDto }>) {
  const [winner, ...runnersUp] = categoryResult.top;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <h2>{categoryResult.categoryName}</h2>
          <Badge variant="outline" className="border-[var(--area)] text-[var(--area)]">{formatVotes(categoryResult.totalVotes)}</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {winner ? <WinnerBlock nominee={winner} /> : <p className="body-small text-[var(--ink-secondary)]">{copy.noNominees}</p>}
        {runnersUp.length > 0 ? (
          <ul className="space-y-2">
            {runnersUp.map((nominee, index) => (
              <RunnerUpRow key={nominee.nomineeId} nominee={nominee} place={index + 2} />
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
