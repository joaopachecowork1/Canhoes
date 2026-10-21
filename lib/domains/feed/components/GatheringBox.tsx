"use client";

import { Calendar, MapPin, UtensilsCrossed } from "lucide-react";

import type { EventGatheringDto, EventGatheringRsvpStatus } from "@/lib/api/types";
import messages from "@/messages/pt.json";

import { GatheringConfirmedSection } from "./GatheringConfirmedSection";
import { GatheringPollingSection } from "./GatheringPollingSection";

const copy = messages.feed.GatheringBox;

type GatheringBoxProps = {
  gathering: EventGatheringDto;
  isAdmin: boolean;
  onVoteDate: (gatheringId: string, optionId: string) => void;
  onConfirmDate: (gatheringId: string, dateText: string) => void;
  onRsvp: (gatheringId: string, status: EventGatheringRsvpStatus, note?: string) => void;
};

/** Widget de encontro/jantar no post: suporta sondagem de datas e modo de RSVP */
export function GatheringBox({ gathering, isAdmin, onVoteDate, onConfirmDate, onRsvp }: Readonly<GatheringBoxProps>) {
  const isPolling = gathering.status === "POLLING";
  const totalVotes = gathering.dateOptions.reduce((acc, opt) => acc + opt.voteCount, 0);

  return (
    <section className="overflow-hidden rounded-[1.25rem] border border-[var(--moss)]/30 bg-[var(--moss)]/5 p-4 sm:p-5">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--moss)]/20 text-[var(--moss-glow)]">
              {isPolling ? <Calendar className="h-4 w-4" /> : <UtensilsCrossed className="h-4 w-4" />}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--moss-glow)]">
              {isPolling ? copy.pollingTitle : copy.confirmedTitle}
            </span>
          </div>

          {gathering.location ? (
            <div className="flex items-center gap-1.5 rounded-full bg-[var(--bg-deep)]/80 px-2.5 py-1 text-xs text-[var(--text-muted)]">
              <MapPin className="h-3 w-3 text-[var(--person-coral)]" />
              <span className="font-medium text-[var(--text-primary)]">{gathering.location}</span>
            </div>
          ) : null}
        </div>

        <h3 className="text-lg font-bold text-[var(--text-primary)]">{gathering.title}</h3>

        {gathering.description ? <p className="text-sm text-[var(--text-muted)]">{gathering.description}</p> : null}
      </div>

      {isPolling ? (
        <GatheringPollingSection
          gatheringId={gathering.id}
          dateOptions={gathering.dateOptions}
          totalVotes={totalVotes}
          isAdmin={isAdmin}
          onVoteDate={onVoteDate}
          onConfirmDate={onConfirmDate}
        />
      ) : (
        <GatheringConfirmedSection gathering={gathering} onRsvp={onRsvp} />
      )}
    </section>
  );
}
