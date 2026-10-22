"use client";

import { Calendar, ExternalLink, MapPin, Navigation, UtensilsCrossed } from "lucide-react";

import type { EventGatheringDto, EventGatheringRsvpStatus } from "@/lib/api/types";
import messages from "@/messages/pt.json";

import { GatheringConfirmedSection } from "./GatheringConfirmedSection";
import { GatheringPollingSection } from "./GatheringPollingSection";

const copy = messages.feed.GatheringBox;

function getGatheringMapImageSrc(gathering: EventGatheringDto): string | null {
  if (gathering.latitude === null || gathering.longitude === null) return null;
  return `/api/v1/events/${gathering.eventId}/places/map?lat=${gathering.latitude}&lng=${gathering.longitude}`;
}

function getGatheringDirectionsUrl(gathering: EventGatheringDto): string | null {
  if (gathering.mapUrl) return gathering.mapUrl;
  const target = gathering.locationAddress || gathering.location;
  if (!target) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}`;
}

function GatheringMapPreview({
  src,
  url,
  locationName,
}: Readonly<{
  src: string;
  url: string;
  locationName: string;
}>) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={copy.viewOnMaps}
      className="group relative block aspect-[21/9] sm:aspect-[2.8/1] w-full overflow-hidden border-t border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--moss-glow)]"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${copy.mapAriaLabel} - ${locationName}`}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-bg-base)]/80 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-40" />
      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold text-white backdrop-blur-sm transition-transform group-hover:scale-105">
        <MapPin className="h-3 w-3 text-[var(--person-coral)]" />
        <span>{copy.viewOnMaps}</span>
      </div>
    </a>
  );
}

/** Cartão de localização e pré-visualização do mapa do encontro. */
function GatheringLocationCard({ gathering }: Readonly<{ gathering: EventGatheringDto }>) {
  if (!gathering.location) return null;

  const mapImageSrc = getGatheringMapImageSrc(gathering);
  const mapsUrl = getGatheringDirectionsUrl(gathering);

  return (
    <div className="overflow-hidden rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-bg-base)]/70 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <div className="flex items-start gap-2 min-w-0">
          <MapPin className="h-4 w-4 shrink-0 text-[var(--person-coral)] mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-[var(--text-primary)] truncate">{gathering.location}</p>
            {gathering.locationAddress ? (
              <p className="text-xs text-[var(--text-muted)] truncate">{gathering.locationAddress}</p>
            ) : null}
          </div>
        </div>

        {mapsUrl ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--moss)]/30 bg-[var(--moss)]/15 px-3.5 py-2 text-xs font-bold text-[var(--moss-glow)] transition-colors hover:bg-[var(--moss)]/25 active:scale-95 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--moss-glow)]"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>{copy.getDirections}</span>
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>
        ) : null}
      </div>

      {mapImageSrc && mapsUrl ? (
        <GatheringMapPreview src={mapImageSrc} url={mapsUrl} locationName={gathering.location} />
      ) : null}
    </div>
  );
}

type GatheringBoxProps = {
  gathering: EventGatheringDto;
  isAdmin: boolean;
  onVoteDate: (gatheringId: string, optionId: string) => void;
  onConfirmDate: (gatheringId: string, dateText: string) => void;
  onRsvp: (gatheringId: string, status: EventGatheringRsvpStatus, note?: string) => void;
};

/** Widget de encontro/jantar no post: suporta localização com mapa, sondagem de datas e modo de RSVP */
export function GatheringBox({ gathering, isAdmin, onVoteDate, onConfirmDate, onRsvp }: Readonly<GatheringBoxProps>) {
  const isPolling = gathering.status === "POLLING";
  const totalVotes = gathering.dateOptions.reduce((acc, opt) => acc + opt.voteCount, 0);

  return (
    <section className="overflow-hidden rounded-[1.25rem] border border-[var(--moss)]/30 bg-[var(--moss)]/5 p-4 sm:p-5">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--moss)]/20 text-[var(--moss-glow)]">
              {isPolling ? <Calendar className="h-4 w-4" /> : <UtensilsCrossed className="h-4 w-4" />}
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--moss-glow)]">
              {isPolling ? copy.pollingTitle : copy.confirmedTitle}
            </span>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{gathering.title}</h3>
          {gathering.description ? (
            <p className="mt-1 text-sm text-[var(--text-muted)]">{gathering.description}</p>
          ) : null}
        </div>

        <GatheringLocationCard gathering={gathering} />
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
