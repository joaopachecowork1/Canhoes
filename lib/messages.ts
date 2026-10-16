/**
 * Fills `{name}` placeholders in a message from messages/pt.json. Unknown placeholders stay as
 * they are, so a typo shows up on screen instead of silently disappearing.
 */
export function formatMessage(template: string, values: Readonly<Record<string, string | number>>) {
  return template.replaceAll(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in values ? String(values[name]) : placeholder,
  );
}

