import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./button";

describe("Button when disabled", () => {
  it("greys out a button that has a box", () => {
    render(<Button disabled>{"Guardar"}</Button>);

    expect(screen.getByRole("button", { name: "Guardar" }).className).toContain("disabled:bg-[");
  });

  it.each(["ghost", "ghost-subtle", "link"] as const)("only dims the %s variant, which has no box to fill", (variant) => {
    render(<Button variant={variant} disabled>{"Voltar"}</Button>);

    const { className } = screen.getByRole("button", { name: "Voltar" });
    expect(className).toContain("disabled:opacity-50");
    expect(className).not.toContain("disabled:bg-[");
    expect(className).not.toContain("disabled:border-");
  });
});
