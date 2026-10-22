"use client";

import { type ChangeEvent, type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MapPin, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PlaceSuggestionDto } from "@/lib/api/types";
import { feedRepo } from "@/lib/repositories/feedRepo";
import messages from "@/messages/pt.json";

const copy = messages.feed.compose;

function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutside();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [ref, onOutside]);
}

function usePlaceSuggestions(
  eventId?: string,
  location?: string,
  isSelected?: boolean,
  onSuccess?: (places: PlaceSuggestionDto[]) => void,
) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestionDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!eventId || isSelected || !location || location.trim().length < 2) {
      return;
    }

    let isSubscribed = true;
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const places = await feedRepo.searchPlaces(eventId, location);
        if (isSubscribed) {
          setSuggestions(places);
          if (places.length > 0) onSuccess?.(places);
        }
      } catch {
        if (isSubscribed) setSuggestions([]);
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    }, 300);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [eventId, location, isSelected, onSuccess]);

  return { suggestions, setSuggestions, isLoading };
}

function GatheringSelectedPlaceCard({
  location,
  address,
  onClear,
}: Readonly<{
  location: string;
  address: string;
  onClear: () => void;
}>) {
  return (
    <div className="flex items-start justify-between gap-2 rounded-xl border border-[var(--moss)]/40 bg-[var(--moss)]/15 p-2.5">
      <div className="flex items-start gap-2 min-w-0">
        <MapPin className="h-4 w-4 shrink-0 text-[var(--person-coral)] mt-0.5" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-[var(--text-primary)] truncate">{location}</p>
          <p className="text-xs text-[var(--text-muted)] truncate">{address}</p>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onClear}
        className="min-h-[36px] text-xs text-[var(--text-muted)] hover:text-[var(--person-coral)] shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--person-coral)]"
      >
        <RotateCcw className="mr-1 h-3 w-3" />
        {copy.clearLocation}
      </Button>
    </div>
  );
}

function GatheringPlaceSuggestionsList({
  suggestions,
  onSelect,
}: Readonly<{
  suggestions: PlaceSuggestionDto[];
  onSelect: (place: PlaceSuggestionDto) => void;
}>) {
  return (
    <ul
      role="listbox"
      aria-label={copy.searchPlacePlaceholder}
      className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-bg-elevated)] p-1.5 shadow-xl backdrop-blur-xl"
    >
      {suggestions.map((suggestion) => (
        <li
          key={suggestion.id}
          role="option"
          tabIndex={0}
          aria-selected={false}
          onClick={() => onSelect(suggestion)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect(suggestion);
            }
          }}
          className="flex min-h-[44px] cursor-pointer flex-col justify-center gap-0.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--color-veil)]/10 focus-visible:bg-[var(--color-veil)]/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--moss-glow)]"
        >
          <span className="text-sm font-semibold text-[var(--text-primary)]">{suggestion.name}</span>
          <span className="text-xs text-[var(--text-muted)] truncate">{suggestion.address}</span>
        </li>
      ))}
    </ul>
  );
}

export type GatheringPlaceSearchProps = {
  eventId?: string;
  location: string;
  onLocationChange: (value: string) => void;
  locationAddress?: string;
  onSelectPlace?: (place: PlaceSuggestionDto | null) => void;
};

/** Campo de pesquisa com autocompletar e pré-visualização de local para jantares/encontros */
export function GatheringPlaceSearch({
  eventId,
  location,
  onLocationChange,
  locationAddress,
  onSelectPlace,
}: Readonly<GatheringPlaceSearchProps>) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleSuccess = useCallback((places: PlaceSuggestionDto[]) => {
    setIsDropdownOpen(places.length > 0);
  }, []);

  const { suggestions, setSuggestions, isLoading } = usePlaceSuggestions(
    eventId,
    location,
    Boolean(locationAddress),
    handleSuccess,
  );

  useClickOutside(dropdownRef, () => setIsDropdownOpen(false));

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    onLocationChange(value);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setIsDropdownOpen(false);
    }
  };

  const handleSelect = (place: PlaceSuggestionDto) => {
    onSelectPlace?.(place);
    setSuggestions([]);
    setIsDropdownOpen(false);
  };

  const handleClear = () => {
    onSelectPlace?.(null);
    setSuggestions([]);
    setIsDropdownOpen(false);
  };

  if (locationAddress) {
    return <GatheringSelectedPlaceCard location={location} address={locationAddress} onClear={handleClear} />;
  }

  const activeSuggestions = location.trim().length >= 2 ? suggestions : [];

  return (
    <div ref={dropdownRef} className="relative">
      <MapPin className="absolute left-3 top-3 h-4 w-4 text-[var(--person-coral)]" />
      <Input
        value={location}
        onChange={handleInputChange}
        onFocus={() => {
          if (activeSuggestions.length > 0) setIsDropdownOpen(true);
        }}
        placeholder={copy.searchPlacePlaceholder}
        className="border-[var(--color-veil)]/15 bg-[var(--bg-paper-soft)] pl-9 pr-9 text-sm"
      />
      {isLoading ? <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-[var(--text-muted)]" /> : null}

      {isDropdownOpen && activeSuggestions.length > 0 ? (
        <GatheringPlaceSuggestionsList suggestions={activeSuggestions} onSelect={handleSelect} />
      ) : null}
    </div>
  );
}
