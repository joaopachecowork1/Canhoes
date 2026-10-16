"use client";

import { useEffect, useState } from "react";

import { OPEN_COMPOSE_SHEET_EVENT } from "@/lib/canhoesEvent";

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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!canCompose) {
      setIsOpen(false);
      return;
    }

    const handleOpenCompose = () => setIsOpen(true);
    globalThis.addEventListener(OPEN_COMPOSE_SHEET_EVENT, handleOpenCompose);
    const timeoutId = globalThis.setTimeout(() => void preload(), PRELOAD_DELAY_MS);

    return () => {
      globalThis.removeEventListener(OPEN_COMPOSE_SHEET_EVENT, handleOpenCompose);
      globalThis.clearTimeout(timeoutId);
    };
  }, [canCompose, preload]);

  return { isOpen, setIsOpen };
}
