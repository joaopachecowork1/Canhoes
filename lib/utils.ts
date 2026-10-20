import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Junta nomes de classes e deixa as classes Tailwind posteriores sobrepor-se às anteriores. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "1 voto", "3 votos": um número com a palavra no singular ou plural que lhe corresponde. */
export function formatCount(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}
