"use client";

import { Calendar, Plus, Trash2, UtensilsCrossed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PlaceSuggestionDto } from "@/lib/api/types";
import messages from "@/messages/pt.json";

import { GatheringPlaceSearch } from "./GatheringPlaceSearch";

const copy = messages.feed.compose;

type ComposeGatheringEditorProps = {
  eventId?: string;
  title: string;
  onTitleChange: (value: string) => void;
  location: string;
  onLocationChange: (value: string) => void;
  locationAddress?: string;
  onSelectPlace?: (place: PlaceSuggestionDto | null) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  dates: string[];
  onDateChange: (index: number, value: string) => void;
  onAddDate: () => void;
  onRemoveDate: (index: number) => void;
};

function GatheringDateRow({
  date,
  index,
  onChange,
  onRemove,
  canRemove,
}: Readonly<{
  date: string;
  index: number;
  onChange: (value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
}>) {
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        min={today}
        value={date}
        onChange={(e) => onChange(e.target.value)}
        aria-label={`${copy.gatheringDatePlaceholder} ${index + 1}`}
        className="h-10 flex-1 border-[var(--color-veil)]/15 bg-[var(--bg-paper-soft)] px-3 text-sm text-[var(--text-primary)] [color-scheme:dark] focus-visible:ring-2 focus-visible:ring-[var(--moss-glow)]"
      />
      {canRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="flex size-10 shrink-0 items-center justify-center rounded-lg p-1 text-[var(--text-muted)] hover:bg-[var(--person-coral)]/10 hover:text-[var(--person-coral)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--person-coral)]"
          title={copy.removeDate}
          aria-label={copy.removeDate}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

/** Editor de encontro / jantar na folha de publicação do admin. */
export function ComposeGatheringEditor({
  eventId,
  title,
  onTitleChange,
  location,
  onLocationChange,
  locationAddress,
  onSelectPlace,
  description,
  onDescriptionChange,
  dates,
  onDateChange,
  onAddDate,
  onRemoveDate,
}: Readonly<ComposeGatheringEditorProps>) {
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--moss)]/30 bg-[var(--moss)]/5 p-3.5 sm:p-4">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--moss-glow)]">
        <UtensilsCrossed className="h-4 w-4" />
        <span>{copy.gatheringLabel}</span>
      </div>

      <div className="space-y-2">
        <Input
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={copy.gatheringTitlePlaceholder}
          className="border-[var(--color-veil)]/15 bg-[var(--bg-paper-soft)] text-sm font-semibold"
        />

        <GatheringPlaceSearch
          eventId={eventId}
          location={location}
          onLocationChange={onLocationChange}
          locationAddress={locationAddress}
          onSelectPlace={onSelectPlace}
        />

        <Input
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={copy.gatheringDescriptionPlaceholder}
          className="border-[var(--color-veil)]/15 bg-[var(--bg-paper-soft)] text-sm"
        />
      </div>

      <div className="space-y-2 border-t border-[var(--color-veil)]/10 pt-2">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-muted)]">
            <Calendar className="h-3.5 w-3.5" />
            {copy.candidateDates}
          </span>
          {dates.length < 10 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAddDate}
              className="h-7 text-xs text-[var(--moss-glow)] hover:bg-[var(--moss)]/10"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {copy.addDate}
            </Button>
          ) : null}
        </div>

        <div className="space-y-1.5">
          {dates.map((date, index) => (
            <GatheringDateRow
              key={`date-${index}`}
              date={date}
              index={index}
              onChange={(value) => onDateChange(index, value)}
              onRemove={() => onRemoveDate(index)}
              canRemove={dates.length > 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
