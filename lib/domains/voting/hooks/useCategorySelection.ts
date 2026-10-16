"use client";

import { useState } from "react";

/**
 * The selected category of a voting, results or nomination view. The user's pick is kept while
 * it is still in `items`; otherwise the first item is selected.
 */
export function useCategorySelection<T>(items: T[], getId: (item: T) => string) {
  const [pickedId, setSelectedId] = useState<string | null>(null);

  const pickedItem = items.find((item) => getId(item) === pickedId);
  const selectedItem = pickedItem ?? items[0] ?? null;

  return {
    selectedId: selectedItem ? getId(selectedItem) : null,
    setSelectedId,
    selectedItem,
    items,
  };
}
