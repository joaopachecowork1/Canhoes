/** `AwardCategory.kind`: what members pick in a category. One list for the server, the admin and the stickers page. */
export const CATEGORY_KIND = {
  /** Members vote for an approved nomination. */
  NOMINEE: 0,
  /** Members vote for a person of the event. */
  USER_VOTE: 1,
  /** Members send a sticker image. */
  STICKER: 2,
} as const;
