/** `AwardCategory.kind`: o que os membros escolhem numa categoria. Lista única para o servidor, a administração e a página de stickers. */
export const CATEGORY_KIND = {
  /** Os membros votam numa nomeação aprovada. */
  NOMINEE: 0,
  /** Os membros votam numa pessoa do evento. */
  USER_VOTE: 1,
  /** Os membros enviam uma imagem de sticker. */
  STICKER: 2,
} as const;

/** Diz se os membros nomeiam alguém nesta categoria (as de pessoa e as de sticker têm outro caminho). */
export function canNominate(kind: number) {
  return kind === CATEGORY_KIND.NOMINEE;
}
