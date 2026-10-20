/** Máximo de ficheiros de media por publicação. */
export const MAX_MEDIA_FILES = 4;
/** Máximo de opções numa sondagem. */
export const MAX_POLL_OPTIONS = 6;
/** Mínimo de opções preenchidas para uma sondagem valer. */
export const MIN_POLL_OPTIONS = 2;

/** Chave de um ficheiro: escolher o mesmo ficheiro duas vezes só o adiciona uma. */
export function getFileKey(file: Pick<File, "name" | "size" | "lastModified">) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/** Move um item um passo para a esquerda (-1) ou direita (1); mover para lá das pontas não altera nada. */
export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= items.length) return items;

  const reordered = [...items];
  const [picked] = reordered.splice(index, 1);
  reordered.splice(targetIndex, 0, picked);
  return reordered;
}

/** As opções da sondagem que o utilizador escreveu, sem espaços nas pontas e sem as vazias. */
export function getFilledPollOptions(options: readonly string[]) {
  return options.map((option) => option.trim()).filter(Boolean);
}

/** Uma sondagem precisa de uma pergunta e de pelo menos duas opções preenchidas. */
export function isPollReady(question: string, options: readonly string[]) {
  return question.trim().length > 0 && getFilledPollOptions(options).length >= MIN_POLL_OPTIONS;
}
