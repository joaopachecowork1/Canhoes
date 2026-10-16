import { parsePostText } from "@/lib/postUtils";

/** A post's text; a multi-line post shows its first line as the title. */
export function PostText({ text }: Readonly<{ text: string }>) {
  if (!text.trim()) return null;

  const { title, body } = parsePostText(text);
  if (!title) {
    return <p className="body-base whitespace-pre-wrap break-words text-[var(--text-primary)] leading-[1.6]">{text}</p>;
  }

  return (
    <div className="space-y-1.5">
      <p className="post-title text-[var(--text-primary)]">{title}</p>
      {body ? <p className="post-body whitespace-pre-wrap break-words text-[var(--ink-secondary)]">{body}</p> : null}
    </div>
  );
}
