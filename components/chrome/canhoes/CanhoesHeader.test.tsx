import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { makeEventContext } from "@/tests/component/eventContext";

import { CanhoesHeader } from "./CanhoesHeader";

const { event, overview } = makeEventContext();

function renderHeader(eventName: string) {
  return render(
    <CanhoesHeader event={{ ...event, name: eventName }} isLoading={false} isMenuOpen={false} onOpenMenu={() => {}} overview={overview} userLabel="Ana" />
  );
}

describe("CanhoesHeader", () => {
  it("names the edition under the brand", () => {
    renderHeader("Canhões 2026");

    expect(screen.getByText("Canhões 2026")).toBeInTheDocument();
  });

  it("does not say the app's name twice when the edition has the same name", () => {
    renderHeader("Canhões do Ano");

    expect(screen.getAllByText("Canhões do Ano")).toHaveLength(1);
  });

  it("shows the phase as a plain label, not as something to tap", () => {
    renderHeader("Canhões 2026");

    const phase = screen.getByText("Propostas");
    expect(phase.closest("button, a")).toBeNull();
    expect(phase.className).not.toContain("shadow-");
  });
});
