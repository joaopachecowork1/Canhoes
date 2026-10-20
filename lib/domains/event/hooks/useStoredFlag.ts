"use client";

import { useSyncExternalStore } from "react";

/** Onde este browser guarda que a boas-vindas foi dispensada; o menu limpa-a para voltar a mostrar. */
export const WELCOME_DISMISSED_STORAGE_KEY = "canhoes:welcome-dismissed";

const listeners = new Set<() => void>();
// Quando o armazenamento é recusado (janelas privadas), a escolha vive aqui até ao fim da visita.
const unsavedFlags = new Map<string, boolean>();

/** Regista `onChange` para mudanças feitas neste separador (listeners) e noutros (evento `storage`). */
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  globalThis.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    globalThis.removeEventListener("storage", onChange);
  };
}

/** Lê a escolha: a guardada em memória tem prioridade; sem armazenamento disponível conta como falso. */
function readFlag(key: string) {
  const unsaved = unsavedFlags.get(key);
  if (unsaved !== undefined) return unsaved;
  try {
    return globalThis.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

/** Uma escolha verdadeiro/falso lembrada neste browser; `serverValue` é o que o render no servidor mostra, antes de se saber a escolha do browser. */
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
    // O evento `storage` só dispara noutros separadores, por isso avisa-se aqui os restantes ouvintes.
    listeners.forEach((notify) => notify());
  };

  return [flag, setFlag] as const;
}
