"use client";

import { useState } from "react";

/**
 * Open/closed state that closes by itself on navigation: when the pathname changes it resets
 * during render ("adjusting state when a prop changes"), so going back to the old path stays closed.
 */
export function usePathScopedOpen(pathname: string | null) {
  const [isOpen, setIsOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setIsOpen(false);
  }

  return [isOpen, setIsOpen] as const;
}
