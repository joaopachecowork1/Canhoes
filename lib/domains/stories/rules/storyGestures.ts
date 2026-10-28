/** Quanto tempo o dedo tem de ficar no ecrã para contar como "premir" (e não como toque). */
export const HOLD_MS = 200;

/** Quanto o dedo tem de andar, em píxeis, para contar como deslize. */
export const SWIPE_DISTANCE_PX = 60;

/** O que um gesto quer dizer quando o dedo se levanta. */
export type StoryGesture = "tap" | "hold" | "close" | "next-author" | "previous-author";

/** Classifica um gesto pelo deslocamento do dedo e pelo tempo que esteve no ecrã. */
export function classifyRelease({
  dx,
  dy,
  heldMs,
}: Readonly<{ dx: number; dy: number; heldMs: number }>): StoryGesture {
  const isVertical = Math.abs(dy) > Math.abs(dx);
  if (isVertical && dy >= SWIPE_DISTANCE_PX) return "close";
  if (!isVertical && Math.abs(dx) >= SWIPE_DISTANCE_PX) return dx < 0 ? "next-author" : "previous-author";
  return heldMs >= HOLD_MS ? "hold" : "tap";
}
