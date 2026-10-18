"use client";

import { useEffect } from "react";

import { OPEN_COMPOSE_SHEET_EVENT } from "@/lib/canhoesEvent";

import { usePathScopedOpen } from "./usePathScopedOpen";

const PRELOAD_DELAY_MS = 1200;

/**
 * Open state of the compose sheet. It closes on navigation and when the feed closes, opens on
 * `OPEN_COMPOSE_SHEET_EVENT`, and its code is preloaded so the first tap on Post is instant.
 */
export function useComposeSheet({
  canCompose,
  pathname,
  preload,
}: Readonly<{ canCompose: boolean; pathname: string | null; preload: () => Promise<unknown> }>) {
  const [isOpenOnPath, setIsOpen] = usePathScopedOpen(pathname);

  useEffect(() => {
    if (!canCompose) return;

    const handleOpenCompose = () => setIsOpen(true);
    globalThis.addEventListener(OPEN_COMPOSE_SHEET_EVENT, handleOpenCompose);
    const timeoutId = globalThis.setTimeout(() => void preload(), PRELOAD_DELAY_MS);

    return () => {
      globalThis.removeEventListener(OPEN_COMPOSE_SHEET_EVENT, handleOpenCompose);
      globalThis.clearTimeout(timeoutId);
    };
  }, [canCompose, preload, setIsOpen]);

  return { isOpen: isOpenOnPath && canCompose, setIsOpen };
}
