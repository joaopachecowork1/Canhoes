/** O nome de um membro como a app o mostra: o nome, senão a parte do email antes do `@`. */
export function getMemberName({ displayName, email }: { displayName: string | null; email: string }) {
  return displayName ?? email.split("@")[0] ?? email;
}
