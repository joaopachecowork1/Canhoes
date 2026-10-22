/**
 * Formata datas de encontros (ex: "2026-11-20" -> "Sex., 20 de nov. de 2026").
 * Se a string não for uma data válida no formato YYYY-MM-DD, devolve o texto original inalterado.
 */
export function formatGatheringDate(dateText: string): string {
  if (!dateText) return "";
  const trimmed = dateText.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const [yearStr, monthStr, dayStr] = trimmed.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return trimmed;
  }

  const formatted = new Intl.DateTimeFormat("pt-PT", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}
