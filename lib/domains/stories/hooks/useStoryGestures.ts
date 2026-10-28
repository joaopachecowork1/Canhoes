import { useEffect, useRef, useState, type PointerEvent } from "react";

import { classifyRelease, HOLD_MS } from "../rules/storyGestures";

/** O dedo que está no ecrã: onde começou, quando, e o temporizador que o transforma em "premir". */
type Finger = { x: number; y: number; startedAt: number; holdTimer: ReturnType<typeof setTimeout> };

/**
 * Os gestos do visualizador: premir para parar, deslizar para baixo para fechar e para os lados para mudar de membro.
 * `unlessGesture` protege os toques: o clique que o browser dispara ao levantar o dedo depois de um gesto é ignorado.
 */
export function useStoryGestures({
  isDisabled,
  onClose,
  onNextAuthor,
  onPreviousAuthor,
}: Readonly<{ isDisabled: boolean; onClose: () => void; onNextAuthor: () => void; onPreviousAuthor: () => void }>) {
  const [isHolding, setIsHolding] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const finger = useRef<Finger | null>(null);
  const shouldIgnoreClick = useRef(false);

  // Um temporizador pendente não pode disparar depois de o visualizador fechar.
  useEffect(() => () => clearTimeout(finger.current?.holdTimer), []);

  const release = () => {
    clearTimeout(finger.current?.holdTimer);
    finger.current = null;
    setIsHolding(false);
    setDragOffset(0);
  };

  const handlePointerDown = (event: PointerEvent) => {
    if (isDisabled || finger.current) return;
    shouldIgnoreClick.current = false;
    const holdTimer = setTimeout(() => setIsHolding(true), HOLD_MS);
    finger.current = { x: event.clientX, y: event.clientY, startedAt: Date.now(), holdTimer };
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!finger.current) return;
    const dx = event.clientX - finger.current.x;
    const dy = event.clientY - finger.current.y;
    // O ecrã só acompanha o dedo quando este desce.
    setDragOffset(dy > 0 && dy > Math.abs(dx) ? dy : 0);
  };

  const handlePointerUp = (event: PointerEvent) => {
    if (!finger.current) return;
    const { x, y, startedAt } = finger.current;
    const gesture = classifyRelease({ dx: event.clientX - x, dy: event.clientY - y, heldMs: Date.now() - startedAt });
    release();

    shouldIgnoreClick.current = gesture !== "tap";
    if (gesture === "close") onClose();
    else if (gesture === "next-author") onNextAuthor();
    else if (gesture === "previous-author") onPreviousAuthor();
  };

  return {
    isHolding,
    dragOffset,
    handlers: {
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
      onPointerCancel: release,
    },
    unlessGesture: (action: () => void) => () => {
      if (shouldIgnoreClick.current) shouldIgnoreClick.current = false;
      else action();
    },
  };
}
