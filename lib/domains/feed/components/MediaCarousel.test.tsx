import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MediaCarousel } from "./MediaCarousel";

const urls = ["/uploads/a.jpg", "/uploads/b.jpg", "/uploads/c.jpg"];

const counter = () => screen.getByText(/^\d \/ 3$/).textContent;
const gallery = () => screen.getByRole("region", { name: "Galeria de imagens do post" });

function swipe(element: Element, { fromX, toX, toY = 0 }: { fromX: number; toX: number; toY?: number }) {
  fireEvent.touchStart(element, { touches: [{ clientX: fromX, clientY: 0 }] });
  fireEvent.touchMove(element, { touches: [{ clientX: toX, clientY: toY }] });
  fireEvent.touchEnd(element, { changedTouches: [{ clientX: toX, clientY: toY }] });
}

describe("MediaCarousel", () => {
  it("renders nothing without images", () => {
    const { container } = render(<MediaCarousel urls={["", ""]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a single image without controls and opens it on click", async () => {
    const onImageClick = vi.fn();
    render(<MediaCarousel urls={["/uploads/a.jpg"]} authorName="Ana" onImageClick={onImageClick} />);

    await userEvent.click(screen.getByRole("img", { name: "Imagem de Ana" }));
    expect(onImageClick).toHaveBeenCalledWith(0);
    expect(screen.queryByRole("button", { name: "Próxima imagem" })).not.toBeInTheDocument();
  });

  it("falls back when an image fails to load", () => {
    render(<MediaCarousel urls={["/uploads/a.jpg"]} />);

    fireEvent.error(screen.getByRole("img", { name: "Media do post" }));
    expect(screen.getByText("Imagem indisponível")).toBeInTheDocument();
  });

  it("moves with the arrows, dots and keyboard, staying inside the strip", async () => {
    render(<MediaCarousel urls={urls} />);

    expect(screen.getByRole("button", { name: "Imagem anterior" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Próxima imagem" }));
    expect(counter()).toBe("2 / 3");

    await userEvent.click(screen.getByRole("button", { name: "Ir para imagem 3" }));
    expect(counter()).toBe("3 / 3");
    expect(screen.getByRole("button", { name: "Próxima imagem" })).toBeDisabled();

    fireEvent.keyDown(gallery(), { key: "ArrowRight" });
    expect(counter()).toBe("3 / 3");
    fireEvent.keyDown(gallery(), { key: "ArrowLeft" });
    expect(counter()).toBe("2 / 3");
  });

  it("changes slide on a horizontal swipe, but not on a vertical scroll", () => {
    render(<MediaCarousel urls={urls} />);
    const track = gallery().firstElementChild;
    if (!track) throw new Error("No track.");

    swipe(track, { fromX: 200, toX: 100 });
    expect(counter()).toBe("2 / 3");
    swipe(track, { fromX: 100, toX: 200 });
    expect(counter()).toBe("1 / 3");
    swipe(track, { fromX: 200, toX: 120, toY: 300 });
    expect(counter()).toBe("1 / 3");
  });

  it("keeps the slide in range when images are removed", async () => {
    const { rerender } = render(<MediaCarousel urls={urls} />);
    await userEvent.click(screen.getByRole("button", { name: "Ir para imagem 3" }));

    rerender(<MediaCarousel urls={urls.slice(0, 2)} />);
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });
});
