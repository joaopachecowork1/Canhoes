"use client";

import { useState } from "react";
import { CalendarCheck, Check, HelpCircle, X } from "lucide-react";

import type { EventGatheringDto, EventGatheringRsvpDto, EventGatheringRsvpStatus } from "@/lib/api/types";
import { formatGatheringDate } from "@/lib/domains/gatherings/rules/gatheringFormatting";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import messages from "@/messages/pt.json";

const copy = messages.feed.GatheringBox;

type GatheringConfirmedSectionProps = {
  gathering: EventGatheringDto;
  onRsvp: (gatheringId: string, status: EventGatheringRsvpStatus, note?: string) => void;
};

function GatheringConfirmedDateBanner({ confirmedDate }: Readonly<{ confirmedDate: string }>) {
  return (
    <div className="flex items-center gap-3 rounded-[var(--radius-md-token)] border border-[var(--moss)]/40 bg-[var(--moss)]/15 p-3">
      <CalendarCheck className="h-5 w-5 shrink-0 text-[var(--moss-glow)]" />
      <div>
        <p className="text-xs font-medium text-[var(--moss-glow)]">{copy.date}</p>
        <p className="text-base font-bold text-[var(--text-primary)]">{formatGatheringDate(confirmedDate)}</p>
      </div>
    </div>
  );
}

type RsvpNoteFieldProps = {
  myRsvp: EventGatheringRsvpStatus | null;
  noteDraft: string;
  onNoteChange: (value: string) => void;
  onSaveNote: () => void;
};

function RsvpNoteField({ myRsvp, noteDraft, onNoteChange, onSaveNote }: Readonly<RsvpNoteFieldProps>) {
  const [showNoteInput, setShowNoteInput] = useState(false);

  if (!showNoteInput && !noteDraft) {
    return (
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowNoteInput(true)}
          className="text-xs text-[var(--moss-glow)] hover:underline"
        >
          {copy.addRsvpNote}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 pt-1">
      <input
        type="text"
        value={noteDraft}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder={copy.rsvpNotePlaceholder}
        className="h-8 flex-1 rounded-[var(--radius-md-token)] border border-[var(--border-subtle)] bg-[var(--bg-deep)] px-2.5 text-xs text-[var(--text-primary)]"
      />
      {myRsvp ? (
        <Button type="button" size="sm" variant="outline" onClick={onSaveNote} className="h-8 text-xs">
          {copy.saveNote}
        </Button>
      ) : null}
    </div>
  );
}

type RsvpButtonsRowProps = {
  gathering: EventGatheringDto;
  onRsvp: (gatheringId: string, status: EventGatheringRsvpStatus, note?: string) => void;
};

function RsvpButtonsRow({ gathering, onRsvp }: Readonly<RsvpButtonsRowProps>) {
  const [noteDraft, setNoteDraft] = useState(gathering.myRsvpNote ?? "");

  const handleRsvp = (status: EventGatheringRsvpStatus) => {
    onRsvp(gathering.id, status, noteDraft.trim() || undefined);
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">{copy.rsvpPrompt}</p>
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          variant={gathering.myRsvp === "GOING" ? "default" : "outline"}
          onClick={() => handleRsvp("GOING")}
          className={cn(
            "h-11 gap-1.5 font-bold",
            gathering.myRsvp === "GOING"
              ? "bg-[var(--moss)] text-[var(--on-moss)] shadow-[var(--glow-green-sm)]"
              : "border-[var(--border-subtle)] hover:border-[var(--moss)]/40",
          )}
        >
          <Check className="h-4 w-4" />
          {copy.going}
        </Button>

        <Button
          type="button"
          variant={gathering.myRsvp === "MAYBE" ? "default" : "outline"}
          onClick={() => handleRsvp("MAYBE")}
          className={cn(
            "h-11 gap-1.5 font-bold",
            gathering.myRsvp === "MAYBE"
              ? "bg-[var(--person-amber)] text-black"
              : "border-[var(--border-subtle)] hover:border-[var(--person-amber)]/40",
          )}
        >
          <HelpCircle className="h-4 w-4" />
          {copy.maybe}
        </Button>

        <Button
          type="button"
          variant={gathering.myRsvp === "NOT_GOING" ? "default" : "outline"}
          onClick={() => handleRsvp("NOT_GOING")}
          className={cn(
            "h-11 gap-1.5 font-bold",
            gathering.myRsvp === "NOT_GOING"
              ? "bg-[var(--area-wishlist)] text-white"
              : "border-[var(--border-subtle)] hover:border-[var(--area-wishlist)]/40",
          )}
        >
          <X className="h-4 w-4" />
          {copy.notGoing}
        </Button>
      </div>

      <RsvpNoteField
        myRsvp={gathering.myRsvp}
        noteDraft={noteDraft}
        onNoteChange={setNoteDraft}
        onSaveNote={() => gathering.myRsvp && handleRsvp(gathering.myRsvp)}
      />
    </div>
  );
}

function AttendeeList({ rsvps }: Readonly<{ rsvps: EventGatheringRsvpDto[] }>) {
  const goingList = rsvps.filter((r) => r.status === "GOING");
  const maybeList = rsvps.filter((r) => r.status === "MAYBE");
  const notGoingList = rsvps.filter((r) => r.status === "NOT_GOING");

  return (
    <div className="space-y-2 border-t border-[var(--border-subtle)]/60 pt-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-[var(--text-primary)]">
          {copy.confirmedAttendees} ({goingList.length})
        </span>
        <span className="text-[var(--text-muted)]">
          {maybeList.length} {copy.maybeAttendees.toLowerCase()} · {notGoingList.length}{" "}
          {copy.notGoingAttendees.toLowerCase()}
        </span>
      </div>

      {goingList.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {goingList.map((rsvp) => (
            <span
              key={rsvp.userId}
              className="flex items-center gap-1.5 rounded-full bg-[var(--bg-deep)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] ring-1 ring-[var(--border-subtle)]"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `var(--person-${rsvp.userColor})` }} />
              {rsvp.userName}
              {rsvp.note ? <span className="text-[10px] italic text-[var(--text-muted)]">({rsvp.note})</span> : null}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)]">{copy.noResponsesYet}</p>
      )}
    </div>
  );
}

/** Modo RSVP quando a data do encontro já está confirmada */
export function GatheringConfirmedSection({ gathering, onRsvp }: Readonly<GatheringConfirmedSectionProps>) {
  return (
    <div className="mt-4 space-y-4">
      {gathering.confirmedDate ? <GatheringConfirmedDateBanner confirmedDate={gathering.confirmedDate} /> : null}
      <RsvpButtonsRow gathering={gathering} onRsvp={onRsvp} />
      <AttendeeList rsvps={gathering.rsvps} />
    </div>
  );
}
