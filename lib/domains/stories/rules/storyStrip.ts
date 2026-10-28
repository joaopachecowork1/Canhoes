import type { PublicUserDto, StoryAuthorDto } from "@/lib/api/types";
import { getMemberName } from "@/lib/memberName";

/** Uma pessoa na faixa: o cromo e, se tem stories ativas, o grupo que o visualizador abre. */
export type StripItem = { userId: string; name: string; color: string; group: StoryAuthorDto | null };

/** Junta os membros e as stories numa só faixa: primeiro quem tem stories (pela ordem delas), depois os restantes membros. */
export function buildStripItems(members: PublicUserDto[], groups: StoryAuthorDto[]): StripItem[] {
  // O servidor já devolve o nome e a cor de quem tem stories (inclui um admin que não é membro).
  const withStories = groups.map((group) => ({
    userId: group.authorUserId,
    name: group.authorName,
    color: group.authorColor,
    group,
  }));

  const authors = new Set(groups.map((group) => group.authorUserId));
  const withoutStories = members
    .filter((member) => !authors.has(member.id))
    .map((member) => ({ userId: member.id, name: getMemberName(member), color: member.color, group: null }));

  return [...withStories, ...withoutStories];
}
