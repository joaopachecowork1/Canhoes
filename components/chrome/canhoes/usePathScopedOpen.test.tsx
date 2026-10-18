import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { usePathScopedOpen } from "./usePathScopedOpen";

function renderOnPath(initialPathname: string) {
  return renderHook(({ pathname }) => usePathScopedOpen(pathname), {
    initialProps: { pathname: initialPathname },
  });
}

describe("usePathScopedOpen", () => {
  it("starts closed and opens on demand", () => {
    const { result } = renderOnPath("/a");
    expect(result.current[0]).toBe(false);

    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
  });

  it("closes when the pathname changes", () => {
    const { result, rerender } = renderOnPath("/a");
    act(() => result.current[1](true));

    rerender({ pathname: "/b" });
    expect(result.current[0]).toBe(false);
  });

  it("stays closed when navigating back to the path it was opened on", () => {
    const { result, rerender } = renderOnPath("/a");
    act(() => result.current[1](true));

    rerender({ pathname: "/b" });
    rerender({ pathname: "/a" });
    expect(result.current[0]).toBe(false);
  });

  it("toggles with an updater function", () => {
    const { result } = renderOnPath("/a");

    act(() => result.current[1]((isOpen) => !isOpen));
    expect(result.current[0]).toBe(true);

    act(() => result.current[1]((isOpen) => !isOpen));
    expect(result.current[0]).toBe(false);
  });

  it("closes with setIsOpen(false)", () => {
    const { result } = renderOnPath("/a");
    act(() => result.current[1](true));

    act(() => result.current[1](false));
    expect(result.current[0]).toBe(false);
  });
});
