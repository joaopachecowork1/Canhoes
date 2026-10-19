/*
 * Every member wears one colour of the group palette: their frame, avatar and marks. The database
 * stores the palette key; the hex lives in app/globals.css as --person-<key>.
 */
export const PERSON_COLORS = ["coral", "amber", "teal", "blue", "pink", "lime", "violet", "sky"] as const;

export type PersonColor = (typeof PERSON_COLORS)[number];

/** Whether a stored or submitted value is one of the palette's colours. */
function isPersonColor(value: unknown): value is PersonColor {
  return typeof value === "string" && (PERSON_COLORS as readonly string[]).includes(value);
}

/** The CSS colour of a person, falling back to the first palette colour for unknown values. */
export function personColorVar(color: string | null | undefined) {
  return `var(--person-${isPersonColor(color) ? color : PERSON_COLORS[0]})`;
}
