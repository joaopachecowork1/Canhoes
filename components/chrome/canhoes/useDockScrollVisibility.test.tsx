import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useDockScrollVisibility } from "./useDockScrollVisibility";

function triggerScroll(scrollY: number) {
  Object.defineProperty(window, "scrollY", { value: scrollY, writable: true });
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

describe("useDockScrollVisibility", () => {
  beforeEach(() => {
    triggerScroll(0);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts visible", () => {
    const { result } = renderHook(() => useDockScrollVisibility());
    expect(result.current.isVisible).toBe(true);
  });

  it("remains visible on small downward scrolls below threshold", () => {
    const { result } = renderHook(() => useDockScrollVisibility({ threshold: 60 }));

    triggerScroll(30);
    expect(result.current.isVisible).toBe(true);
  });

  it("hides when scrolling down more than the threshold", () => {
    const { result } = renderHook(() => useDockScrollVisibility({ threshold: 60 }));

    triggerScroll(70);
    expect(result.current.isVisible).toBe(false);
  });

  it("reappears when scrolling up", () => {
    const { result } = renderHook(() => useDockScrollVisibility({ threshold: 60 }));

    triggerScroll(100);
    expect(result.current.isVisible).toBe(false);

    triggerScroll(85);
    expect(result.current.isVisible).toBe(true);
  });

  it("stays visible when near the top of the page", () => {
    const { result } = renderHook(() => useDockScrollVisibility({ threshold: 60 }));

    triggerScroll(100);
    expect(result.current.isVisible).toBe(false);

    triggerScroll(10);
    expect(result.current.isVisible).toBe(true);
  });

  it("remains visible when disabled (e.g. compose open)", () => {
    const { result } = renderHook(() => useDockScrollVisibility({ disabled: true, threshold: 60 }));

    triggerScroll(150);
    expect(result.current.isVisible).toBe(true);
  });
});
