"use client";

import { useState } from "react";

/**
 * A categoria selecionada numa vista de votação, resultados ou nomeações. A escolha do utilizador mantém-se
 * enquanto ainda estiver em `items`; caso contrário seleciona-se o primeiro item.
 */
export function useCategorySelection<T>(items: T[], getId: (item: T) => string) {
  const [pickedId, setSelectedId] = useState<string | null>(null);

  // Estado derivado: se a escolha desapareceu da lista, cai para o primeiro item sem precisar de effect.
  const pickedItem = items.find((item) => getId(item) === pickedId);
  const selectedItem = pickedItem ?? items[0] ?? null;

  return {
    selectedId: selectedItem ? getId(selectedItem) : null,
    setSelectedId,
    selectedItem,
    items,
  };
}
