import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { EventModulesDto } from "@/lib/api/types";

import { AreaTabs } from "./AreaTabs";

const closed: EventModulesDto = {
  feed: true, nominees: false, categories: false, secretSanta: false, wishlist: false,
  voting: false, stickers: false, measures: false, gala: false, admin: false,
};

describe("AreaTabs", () => {
  it("links the open pages of the same area, the current one marked", () => {
    render(<AreaTabs current="stickers" modules={{ ...closed, nominees: true, stickers: true }} />);

    expect(screen.getByRole("link", { name: "Nomeações" })).toHaveAttribute("href", "/canhoes/nomeacoes");
    expect(screen.getByRole("link", { name: "Stickers" })).toHaveAttribute("aria-current", "page");
  });

  it("works from the parent page too", () => {
    render(<AreaTabs current="categories" modules={{ ...closed, categories: true, measures: true }} />);
    expect(screen.getByRole("link", { name: "Medidas" })).toHaveAttribute("href", "/canhoes/medidas");
  });

  it("shows nothing when there is no sibling page to go to", () => {
    const { container } = render(<AreaTabs current="nominees" modules={{ ...closed, nominees: true }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing before the modules are known", () => {
    const { container } = render(<AreaTabs current="nominees" modules={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});
