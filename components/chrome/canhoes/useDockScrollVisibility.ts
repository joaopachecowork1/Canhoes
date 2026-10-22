"use client";

import { useEffect, useRef, useState } from "react";

type UseDockScrollVisibilityOptions = {
  disabled?: boolean;
  threshold?: number;
};

const DEFAULT_THRESHOLD = 60;
const TOP_OFFSET_THRESHOLD = 15;

/**
 * Controla a visibilidade da dock flutuante conforme a rolagem da página.
 * Esconde-se ao rolar deliberadamente para baixo (> threshold) e reaparece ao rolar para cima ou no topo.
 */
export function useDockScrollVisibility(options: UseDockScrollVisibilityOptions = {}) {
  const { disabled = false, threshold = DEFAULT_THRESHOLD } = options;
  const [isVisible, setIsVisible] = useState(true);

  const lastScrollY = useRef(0);
  const accumulatedDelta = useRef(0);

  useEffect(() => {
    if (disabled) return;

    function handleScroll() {
      const currentScrollY = Math.max(0, window.scrollY);
      const delta = currentScrollY - lastScrollY.current;

      // Sempre visível no topo da página
      if (currentScrollY <= TOP_OFFSET_THRESHOLD) {
        setIsVisible(true);
        accumulatedDelta.current = 0;
        lastScrollY.current = currentScrollY;
        return;
      }

      if (delta > 0) {
        // Rolagem para baixo: acumula distância descendente
        accumulatedDelta.current = Math.max(0, accumulatedDelta.current) + delta;
        if (accumulatedDelta.current >= threshold) {
          setIsVisible(false);
        }
      } else if (delta < 0) {
        // Rolagem para cima: reaparece imediatamente
        setIsVisible(true);
        accumulatedDelta.current = 0;
      }

      lastScrollY.current = currentScrollY;
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [disabled, threshold]);

  return { isVisible: disabled || isVisible };
}
