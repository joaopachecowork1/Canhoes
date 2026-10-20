import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { CANHOES_MODULE_BY_KEY } from "@/lib/modules";

import { CanhoesModuleHeader } from "./CanhoesModuleHeader";

describe("CanhoesModuleHeader", () => {
  it("shows the icon the area has in the dock and the menu", () => {
    render(<CanhoesModuleHeader module="stickers" title="Stickers" description="Envia um sticker" />);

    const icon = screen.getByRole("heading", { name: "Stickers" }).querySelector("svg");
    const expected = CANHOES_MODULE_BY_KEY.stickers.icon.displayName;
    expect(icon?.getAttribute("class")).toContain(`lucide-${expected?.toLowerCase()}`);
  });
});
