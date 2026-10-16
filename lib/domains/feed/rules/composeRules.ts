export const MAX_MEDIA_FILES = 4;
export const MAX_POLL_OPTIONS = 6;
export const MIN_POLL_OPTIONS = 2;

/** Picking the same file twice adds it once. */
export function getFileKey(file: Pick<File, "name" | "size" | "lastModified">) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/** Moves one item a step left (-1) or right (1); moves past either end change nothing. */
export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= items.length) return items;

  const reordered = [...items];
  const [picked] = reordered.splice(index, 1);
  reordered.splice(targetIndex, 0, picked);
  return reordered;
}

export function getFilledPollOptions(options: readonly string[]) {
  return options.map((option) => option.trim()).filter(Boolean);
}

/** A poll needs a question and at least two filled options. */
export function isPollReady(question: string, options: readonly string[]) {
  return question.trim().length > 0 && getFilledPollOptions(options).length >= MIN_POLL_OPTIONS;
}
