import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { OPEN_COMPOSE_SHEET_EVENT } from "@/lib/canhoesEvent";

import { useComposeSheet } from "./useComposeSheet";

function renderComposeSheet({ canCompose = true, pathname = "/canhoes" } = {}) {
  const preload = vi.fn(() => Promise.resolve());
  const hook = renderHook((props) => useComposeSheet({ preload, ...props }), {
    initialProps: { canCompose, pathname },
  });
  return { ...hook, preload };
}

const openComposeSheet = () => act(() => void globalThis.dispatchEvent(new Event(OPEN_COMPOSE_SHEET_EVENT)));

describe("useComposeSheet", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("opens on the open-compose event and closes on navigation", () => {
    const { result, rerender } = renderComposeSheet();

    openComposeSheet();
    expect(result.current.isOpen).toBe(true);

    rerender({ canCompose: true, pathname: "/canhoes/votacao" });
    expect(result.current.isOpen).toBe(false);
  });

  it("ignores the event and stays closed when the user cannot compose", () => {
    const { result } = renderComposeSheet({ canCompose: false });

    openComposeSheet();
    expect(result.current.isOpen).toBe(false);
  });

  it("closes when composing stops being allowed", () => {
    const { result, rerender } = renderComposeSheet();
    openComposeSheet();

    rerender({ canCompose: false, pathname: "/canhoes" });
    expect(result.current.isOpen).toBe(false);
  });

  it("preloads the sheet after a delay, only when the user can compose", () => {
    const { preload } = renderComposeSheet();
    const { preload: preloadWithoutCompose } = renderComposeSheet({ canCompose: false });

    vi.advanceTimersByTime(1200);
    expect(preload).toHaveBeenCalledOnce();
    expect(preloadWithoutCompose).not.toHaveBeenCalled();
  });

  it("stops listening and cancels the preload on unmount", () => {
    const { result, unmount, preload } = renderComposeSheet();
    unmount();

    openComposeSheet();
    vi.advanceTimersByTime(1200);
    expect(result.current.isOpen).toBe(false);
    expect(preload).not.toHaveBeenCalled();
  });
});
