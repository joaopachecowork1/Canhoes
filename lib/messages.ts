/**
 * Preenche os marcadores `{nome}` de uma mensagem de messages/pt.json. Os marcadores desconhecidos
 * ficam como estão, para um erro de escrita aparecer no ecrã em vez de desaparecer em silêncio.
 */
export function formatMessage(template: string, values: Readonly<Record<string, string | number>>) {
  return template.replaceAll(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in values ? String(values[name]) : placeholder,
  );
}
