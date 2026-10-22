import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { EventGatheringDto } from "@/lib/api/types";
import { GatheringBox } from "./GatheringBox";

const pollingGathering: EventGatheringDto = {
  id: "g1",
  eventId: "e1",
  title: "Jantar de Natal",
  description: "Tragam prendas",
  location: "Baixa",
  locationAddress: null,
  latitude: null,
  longitude: null,
  mapUrl: null,
  placeId: null,
  status: "POLLING",
  confirmedDate: null,
  postId: "p1",
  createdAtUtc: "2026-10-21T12:00:00Z",
  dateOptions: [
    { id: "opt1", dateText: "19 Dezembro", sortOrder: 0, voteCount: 3, hasVoted: true },
    { id: "opt2", dateText: "20 Dezembro", sortOrder: 1, voteCount: 1, hasVoted: false },
  ],
  rsvps: [],
  myRsvp: null,
  myRsvpNote: null,
};

const confirmedGathering: EventGatheringDto = {
  id: "g2",
  eventId: "e1",
  title: "Jantar de Natal",
  description: "Confirmado!",
  location: "Restaurante Central",
  locationAddress: "Rua Direita 10",
  latitude: 38.71,
  longitude: -9.14,
  mapUrl: "https://maps.google.com/?cid=123",
  placeId: "place-1",
  status: "CONFIRMED",
  confirmedDate: "19 Dezembro às 20h",
  postId: "p2",
  createdAtUtc: "2026-10-21T12:00:00Z",
  dateOptions: [],
  rsvps: [
    {
      userId: "u1",
      userName: "João",
      userColor: "coral",
      status: "GOING",
      note: null,
      updatedAtUtc: "2026-10-21T13:00:00Z",
    },
    {
      userId: "u2",
      userName: "Maria",
      userColor: "teal",
      status: "MAYBE",
      note: "Chego tarde",
      updatedAtUtc: "2026-10-21T13:30:00Z",
    },
  ],
  myRsvp: "GOING",
  myRsvpNote: null,
};

describe("GatheringBox", () => {
  it("renders polling mode with dates and calls onVoteDate when tapped", async () => {
    const onVoteDate = vi.fn();
    render(
      <GatheringBox
        gathering={pollingGathering}
        isAdmin={false}
        onVoteDate={onVoteDate}
        onConfirmDate={vi.fn()}
        onRsvp={vi.fn()}
      />,
    );

    expect(screen.getByText("Jantar de Natal")).toBeInTheDocument();
    expect(screen.getByText("Baixa")).toBeInTheDocument();
    expect(screen.getByText("19 Dezembro")).toBeInTheDocument();
    expect(screen.getByText("20 Dezembro")).toBeInTheDocument();

    await userEvent.click(screen.getByText("20 Dezembro"));
    expect(onVoteDate).toHaveBeenCalledWith("g1", "opt2");
  });

  it("renders confirmed mode with RSVP buttons and attendee count", async () => {
    const onRsvp = vi.fn();
    render(
      <GatheringBox
        gathering={confirmedGathering}
        isAdmin={false}
        onVoteDate={vi.fn()}
        onConfirmDate={vi.fn()}
        onRsvp={onRsvp}
      />,
    );

    expect(screen.getByText("19 Dezembro às 20h")).toBeInTheDocument();
    expect(screen.getByText("João")).toBeInTheDocument();

    const maybeButton = screen.getByRole("button", { name: /talvez/i });
    await userEvent.click(maybeButton);
    expect(onRsvp).toHaveBeenCalledWith("g2", "MAYBE", undefined);
  });

  it("renders map image and directions link when coordinates are provided", () => {
    render(
      <GatheringBox
        gathering={confirmedGathering}
        isAdmin={false}
        onVoteDate={vi.fn()}
        onConfirmDate={vi.fn()}
        onRsvp={vi.fn()}
      />,
    );

    expect(screen.getByText("Restaurante Central")).toBeInTheDocument();
    expect(screen.getByText("Rua Direita 10")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /como chegar/i })).toHaveAttribute(
      "href",
      "https://maps.google.com/?cid=123",
    );
    expect(screen.getByRole("img", { name: /mapa de localização/i })).toHaveAttribute(
      "src",
      "/api/v1/events/e1/places/map?lat=38.71&lng=-9.14",
    );
  });
});
