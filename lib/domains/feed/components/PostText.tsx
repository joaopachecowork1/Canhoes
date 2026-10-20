import { parsePostText } from "@/lib/postUtils";

/** O texto de um post; um post com várias linhas mostra a primeira como título. */
export function PostText({ text }: Readonly<{ text: string }>) {
  if (!text.trim()) return null;

  const { title, body } = parsePostText(text);
  if (!title) {
    return <p className="body-base whitespace-pre-wrap break-words text-[var(--text-primary)] leading-[1.6]">{text}</p>;
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[var(--text-primary)]">{title}</p>
      {body ? <p className="whitespace-pre-wrap break-words text-[var(--ink-secondary)]">{body}</p> : null}
    </div>
  );
}
