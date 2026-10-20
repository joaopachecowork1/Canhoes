import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ImageLightbox } from "./ImageLightbox";

const images = ["/uploads/a.jpg", "/uploads/b.jpg", "/uploads/c.jpg"];

function renderLightbox(props: Partial<Parameters<typeof ImageLightbox>[0]> = {}) {
  const onClose = vi.fn();
  render(
    <ImageLightbox
      images={images}
      initialIndex={0}
      open
      onClose={onClose}
      authorName="Ana"
      createdAtUtc="2026-10-01T10:00:00.000Z"
      {...props}
    />,
  );
  return { onClose, dialog: screen.queryByRole("dialog", { name: "Visualizador de imagem" }) };
}

const counter = () => screen.getByText(/^\d \/ 3$/).textContent;
const swipe = (element: Element, fromX: number, toX: number) => {
  fireEvent.touchStart(element, { touches: [{ clientX: fromX, clientY: 0 }] });
  fireEvent.touchEnd(element, { changedTouches: [{ clientX: toX, clientY: 0 }] });
};

describe("ImageLightbox", () => {
  it("renders nothing while closed or without images", () => {
    expect(renderLightbox({ open: false }).dialog).toBeNull();
    expect(renderLightbox({ images: ["", ""] }).dialog).toBeNull();
  });

  it("shows the author and moves with the arrows and dots", async () => {
    renderLightbox({ initialIndex: 1 });

    expect(screen.getByRole("img", { name: "Imagem de Ana" })).toBeInTheDocument();
    expect(counter()).toBe("2 / 3");

    await userEvent.click(screen.getByRole("button", { name: "Próxima imagem" }));
    expect(counter()).toBe("3 / 3");
    expect(screen.queryByRole("button", { name: "Próxima imagem" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Ir para imagem 1" }));
    expect(counter()).toBe("1 / 3");
    expect(screen.queryByRole("button", { name: "Imagem anterior" })).not.toBeInTheDocument();
  });

  it("moves with the keyboard and closes on Escape", () => {
    const { onClose, dialog } = renderLightbox();
    if (!dialog) throw new Error("No dialog.");

    fireEvent.keyDown(dialog, { key: "ArrowRight" });
    expect(counter()).toBe("2 / 3");
    fireEvent.keyDown(dialog, { key: "ArrowLeft" });
    expect(counter()).toBe("1 / 3");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("moves with swipes past the threshold only", () => {
    renderLightbox();
    const image = screen.getByRole("img").parentElement;
    if (!image) throw new Error("No image frame.");

    swipe(image, 200, 180);
    expect(counter()).toBe("1 / 3");
    swipe(image, 200, 100);
    expect(counter()).toBe("2 / 3");
    swipe(image, 100, 200);
    expect(counter()).toBe("1 / 3");
  });

  it("closes from the close button and locks the page scroll while open", async () => {
    const { onClose } = renderLightbox({ images: ["/uploads/a.jpg"], authorName: undefined });

    expect(document.body.style.overflow).toBe("hidden");
    expect(screen.getByRole("img", { name: "Imagem da publicação" })).toBeInTheDocument();
    expect(screen.queryByText(/\/ 1/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(onClose).toHaveBeenCalled();
  });
});
