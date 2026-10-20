import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { parsePostText, useRelativeTime } from "./postUtils";

describe("parsePostText", () => {
  it("has no title or body for empty text", () => {
    expect(parsePostText(null)).toEqual({ title: null, body: null });
    expect(parsePostText("  \n ")).toEqual({ title: null, body: null });
  });

  it("treats a single line as the body", () => {
    expect(parsePostText("  Olá a todos ")).toEqual({ title: null, body: "Olá a todos" });
  });

  it("takes the first line as the title and the rest as the body", () => {
    expect(parsePostText("Título\r\nprimeira\nsegunda")).toEqual({ title: "Título", body: "primeira\nsegunda" });
  });

  it("ignores blank lines after the first line", () => {
    expect(parsePostText("Título\n   ")).toEqual({ title: null, body: "Título" });
    expect(parsePostText("Título\n \n  \nresto")).toEqual({ title: "Título", body: "resto" });
  });
});

describe("useRelativeTime", () => {
  const NOW = new Date("2026-10-20T12:00:00.000Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  const ago = (seconds: number) => new Date(NOW.getTime() - seconds * 1000).toISOString();

  it.each([
    [30, "agora"],
    [5 * 60, "5min"],
    [3 * 3600, "3h"],
    [2 * 86400, "2d"],
    [90 * 86400, "3mo"],
    [800 * 86400, "2a"],
  ])("shows %i seconds ago as %s", (seconds, label) => {
    const { result } = renderHook(() => useRelativeTime(ago(seconds)));
    expect(result.current).toBe(label);
  });

  it("moves on by itself every minute", () => {
    const { result } = renderHook(() => useRelativeTime(ago(30)));
    expect(result.current).toBe("agora");

    act(() => vi.advanceTimersByTime(60_000));

    expect(result.current).toBe("1min");
  });
});
