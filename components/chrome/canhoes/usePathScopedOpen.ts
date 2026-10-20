"use client";

import { useState } from "react";

/**
 * Estado aberto/fechado que fecha sozinho ao navegar: quando o `pathname` muda, repõe-se
 * durante o render ("ajustar estado quando uma prop muda"), por isso voltar ao caminho antigo continua fechado.
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
