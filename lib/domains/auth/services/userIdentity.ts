const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Whether a token value is a `Users.Id` (a UUID) rather than a provider id. */
export function isDatabaseUserId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}
