import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mediaQuery = globalThis.matchMedia(QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

/** Diz se a pessoa pediu menos movimento ao sistema (e acompanha a mudança). */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => globalThis.matchMedia(QUERY).matches,
    () => false,
  );
}
