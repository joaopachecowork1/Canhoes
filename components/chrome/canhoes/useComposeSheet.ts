"use client";

import { useEffect } from "react";

import { OPEN_COMPOSE_SHEET_EVENT } from "@/lib/canhoesEvent";

import { usePathScopedOpen } from "./usePathScopedOpen";

const PRELOAD_DELAY_MS = 1200;

/**
 * Estado aberto/fechado da folha de publicar. Fecha ao navegar e quando o feed fecha, abre com
 * `OPEN_COMPOSE_SHEET_EVENT`, e o seu código é pré-carregado para o primeiro toque em Publicar ser instantâneo.
 */
export function useComposeSheet({
  canCompose,
  pathname,
  preload,
}: Readonly<{ canCompose: boolean; pathname: string | null; preload: () => Promise<unknown> }>) {
  const [isOpenOnPath, setIsOpen] = usePathScopedOpen(pathname);

  useEffect(() => {
    if (!canCompose) return;

    // Outras partes da app pedem a abertura por evento global, sem importar este hook.
    const handleOpenCompose = () => setIsOpen(true);
    globalThis.addEventListener(OPEN_COMPOSE_SHEET_EVENT, handleOpenCompose);
    // Pré-carrega com atraso para não competir com o carregamento inicial da página.
    const timeoutId = globalThis.setTimeout(() => void preload(), PRELOAD_DELAY_MS);

    return () => {
      globalThis.removeEventListener(OPEN_COMPOSE_SHEET_EVENT, handleOpenCompose);
      globalThis.clearTimeout(timeoutId);
    };
  }, [canCompose, preload, setIsOpen]);

  return { isOpen: isOpenOnPath && canCompose, setIsOpen };
}
