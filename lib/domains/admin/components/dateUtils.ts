/** Formata uma data UTC em texto de data e hora pt-PT (usado em metadados como "criado em"); devolve o original se for inválida. */
export function formatDateTimeUtc(date: string): string {
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleString("pt-PT");
}
