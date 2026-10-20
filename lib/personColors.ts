/*
 * Cada membro usa uma cor da paleta do grupo: a moldura, o avatar e as marcas. A base de dados
 * guarda a chave da paleta; o hex vive em app/globals.css como --person-<chave>.
 */
export const PERSON_COLORS = ["coral", "amber", "teal", "blue", "pink", "lime", "violet", "sky"] as const;

/** Uma das chaves de cor de `PERSON_COLORS`. */
export type PersonColor = (typeof PERSON_COLORS)[number];

/** Indica se um valor guardado ou enviado é uma das cores da paleta. */
function isPersonColor(value: unknown): value is PersonColor {
  return typeof value === "string" && (PERSON_COLORS as readonly string[]).includes(value);
}

/** A cor CSS de uma pessoa; valores desconhecidos usam a primeira cor da paleta. */
export function personColorVar(color: string | null | undefined) {
  return `var(--person-${isPersonColor(color) ? color : PERSON_COLORS[0]})`;
}
