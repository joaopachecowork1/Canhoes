import { personColorVar } from "@/lib/personColors";
import { cn } from "@/lib/utils";

const SIZE_CLASS = {
  sm: "size-8 rounded-lg border-2 text-xs",
  md: "size-10 rounded-[0.625rem] border-[3px] text-sm",
  lg: "size-16 rounded-xl border-4 text-xl",
} as const;

/** First letters of the first and last word, upper-cased ("Ana Silva" → "AS"). */
function initialsOf(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words.length > 1 ? (words.at(-1)?.[0] ?? "") : "")).toUpperCase() || "?";
}

/** A member's cromo: their photo or initials inside a frame of their own colour. */
export function PersonCromo({
  name,
  color,
  image,
  size = "md",
  className,
}: Readonly<{
  name: string;
  color?: string | null;
  image?: string | null;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}>) {
  const frame = personColorVar(color);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden bg-[var(--page)] font-[family-name:var(--font-display)] font-extrabold shadow-[var(--shadow-elevation-sm)]",
        SIZE_CLASS[size],
        className,
      )}
      style={{ borderColor: frame, color: frame }}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatars are tiny and already sized
        <img src={image} alt="" className="size-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
