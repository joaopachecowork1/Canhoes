import { cn } from "@/lib/utils";

import { initials } from "./hubUtils";

/** Round avatar: the photo when there is one, else the initials. */
export function UserAvatar({
  name,
  image,
  className,
}: Readonly<{ name: string; image?: string | null; className?: string }>) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[var(--border-paper)] text-[10px] font-semibold text-[var(--text-muted)]",
        className
      )}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name} className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
