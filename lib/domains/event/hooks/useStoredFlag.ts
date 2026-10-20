"use client";

import { useSyncExternalStore } from "react";

/** Where this browser remembers that the welcome was dismissed; the menu clears it to show it again. */
export const WELCOME_DISMISSED_STORAGE_KEY = "canhoes:welcome-dismissed";

const listeners = new Set<() => void>();
// When storage is refused (private windows), the choice lives here for the rest of the visit.
const unsavedFlags = new Map<string, boolean>();

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  globalThis.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    globalThis.removeEventListener("storage", onChange);
  };
}

function readFlag(key: string) {
  const unsaved = unsavedFlags.get(key);
  if (unsaved !== undefined) return unsaved;
  try {
    return globalThis.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

/** A true/false choice remembered in this browser; `serverValue` is what the server render shows, before the browser's choice is known. */
export function useStoredFlag(key: string, serverValue: boolean) {
  const flag = useSyncExternalStore(
    subscribe,
    () => readFlag(key),
    () => serverValue,
  );

  const setFlag = (next: boolean) => {
    try {
      globalThis.localStorage.setItem(key, String(next));
      unsavedFlags.delete(key);
    } catch {
      unsavedFlags.set(key, next);
    }
    listeners.forEach((notify) => notify());
  };

  return [flag, setFlag] as const;
}
