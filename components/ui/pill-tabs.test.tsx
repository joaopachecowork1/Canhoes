import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Gift } from "lucide-react";

import { PillTabs } from "./pill-tabs";

const items = [
  { id: "one", label: "Primeiro", badge: 3 },
  { id: "two", label: "Segundo", icon: Gift },
];

describe("PillTabs", () => {
  it("marks the active tab and tells the parent which one was picked", async () => {
    const onSelect = vi.fn();
    render(<PillTabs items={items} activeId="one" onSelect={onSelect} />);

    expect(screen.getByRole("button", { name: /Primeiro/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Segundo" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("3")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Segundo" }));
    expect(onSelect).toHaveBeenCalledWith("two");
  });

  it("renders links with the current page marked when items have an href", () => {
    render(<PillTabs items={[{ id: "a", label: "Conteúdo", href: "/canhoes/admin/conteudo" }, { id: "b", label: "Membros", href: "/canhoes/admin/membros" }]} activeId="b" />);

    expect(screen.getByRole("link", { name: "Membros" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Conteúdo" })).not.toHaveAttribute("aria-current");
  });

  it("spreads the tabs over the full width when stretched", () => {
    const { container } = render(<PillTabs items={items} activeId="two" stretch size="md" />);

    expect(container.querySelector("[style]")).toHaveStyle({ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" });
  });
});
