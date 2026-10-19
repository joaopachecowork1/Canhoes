import { cn } from "@/lib/utils";

type CanhoesBrandIconProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const BRAND_INITIAL = "C";

const SIZE_CLASS: Record<NonNullable<CanhoesBrandIconProps["size"]>, string> = {
  sm: "size-10 rounded-[0.7rem] p-[3px] text-xl",
  md: "size-12 rounded-xl p-[3px] text-2xl",
  lg: "size-16 rounded-2xl p-1 text-4xl",
};

/** The Canhões mark on its own: a cromo with every member's colour around the letter C. */
export function CanhoesBrandIcon({
  className,
  size = "md",
}: Readonly<CanhoesBrandIconProps>) {
  return (
    <div
      className={cn(
        "shrink-0 bg-[conic-gradient(var(--person-coral),var(--person-amber),var(--person-lime),var(--person-teal),var(--person-sky),var(--person-blue),var(--person-violet),var(--person-pink),var(--person-coral))] shadow-[var(--shadow-elevation-sm)]",
        SIZE_CLASS[size],
        className
      )}
      aria-hidden="true"
    >
      <div className="flex size-full items-center justify-center rounded-[inherit] bg-[var(--page)] font-[family-name:var(--font-display)] font-extrabold leading-none text-[var(--moss-glow)]">
        {BRAND_INITIAL}
      </div>
    </div>
  );
}
