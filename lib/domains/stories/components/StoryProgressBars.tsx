import { STORY_DURATION_MS } from "../rules/storyPlayback";

/** A barra da story que está no ecrã: enche em `STORY_DURATION_MS` (parada se `isRunning` for falso) e, sem avanço automático, fica cheia. */
function CurrentStoryBar({
  isRunning,
  autoAdvance,
  onFinished,
}: Readonly<{ isRunning: boolean; autoAdvance: boolean; onFinished: () => void }>) {
  return (
    <span
      className="block h-full origin-left bg-[var(--text-primary)]"
      style={
        autoAdvance
          ? {
              animation: `story-progress ${STORY_DURATION_MS}ms linear forwards`,
              animationPlayState: isRunning ? "running" : "paused",
            }
          : undefined
      }
      onAnimationEnd={autoAdvance ? onFinished : undefined}
    />
  );
}

/** Uma barra por story do membro: as vistas cheias, a atual a encher e as seguintes vazias. */
export function StoryProgressBars({
  storyIds,
  currentIndex,
  isRunning,
  autoAdvance,
  onFinished,
}: Readonly<{
  storyIds: string[];
  currentIndex: number;
  isRunning: boolean;
  autoAdvance: boolean;
  onFinished: () => void;
}>) {
  return (
    <ol className="flex gap-1 px-3 pt-3">
      {storyIds.map((storyId, index) => (
        <li
          key={storyId}
          aria-current={index === currentIndex ? "step" : undefined}
          className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--color-veil)]/45"
        >
          {index < currentIndex ? <span className="block h-full bg-[var(--text-primary)]" /> : null}
          {index === currentIndex ? (
            <CurrentStoryBar isRunning={isRunning} autoAdvance={autoAdvance} onFinished={onFinished} />
          ) : null}
        </li>
      ))}
    </ol>
  );
}
