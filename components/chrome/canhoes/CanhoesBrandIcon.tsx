import { cn } from "@/lib/utils";

type CanhoesBrandIconProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASS: Record<NonNullable<CanhoesBrandIconProps["size"]>, string> = {
  sm: "h-10 w-10",
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

/** The Canhões logo on its own, in three sizes. */
export function CanhoesBrandIcon({
  className,
  size = "md",
}: Readonly<CanhoesBrandIconProps>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[14px] border border-[rgba(230,204,161,0.36)] bg-[linear-gradient(160deg,#304724,#1a2614)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_12px_22px_rgba(0,0,0,0.28)]",
        SIZE_CLASS[size],
        className
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 80 80" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="cda-shine" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(28 16) rotate(48) scale(52)">
            <stop stopColor="#FFE7A8" stopOpacity="0.5" />
            <stop offset="1" stopColor="#FFE7A8" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect x="0" y="0" width="80" height="80" fill="url(#cda-shine)" />

        <g opacity="0.35" stroke="#e7cf9b" strokeWidth="1.5">
          <line x1="40" y1="4" x2="40" y2="16" />
          <line x1="40" y1="4" x2="34" y2="14" />
          <line x1="40" y1="4" x2="46" y2="14" />
        </g>

        <circle cx="40" cy="41" r="22" fill="rgba(10,14,8,0.38)" stroke="#e8cf9d" strokeOpacity="0.32" strokeWidth="1.4" />

        <g transform="translate(40 41) rotate(-31)">
          <path d="M-18 -3.2L10 -2.4L16 0L10 2.4L-18 3.2L-16 0Z" fill="#B48A58" />
          <path d="M-18 -3.2L10 -2.4L10 2.4L-18 3.2Z" fill="#C79D69" />
          <path d="M-19.8 -2.4L-18 -3.2L-16 0L-18 3.2L-19.8 2.4Z" fill="#F3E5C8" />
          <circle cx="16.2" cy="0" r="1.4" fill="#FFB14A" />
          <circle cx="16.2" cy="0" r="0.7" fill="#FF6A2A" />
        </g>

        <g transform="translate(40 41) rotate(31)">
          <path d="M-18 -3.2L10 -2.4L16 0L10 2.4L-18 3.2L-16 0Z" fill="#B48A58" />
          <path d="M-18 -3.2L10 -2.4L10 2.4L-18 3.2Z" fill="#C79D69" />
          <path d="M-19.8 -2.4L-18 -3.2L-16 0L-18 3.2L-19.8 2.4Z" fill="#F3E5C8" />
          <circle cx="16.2" cy="0" r="1.4" fill="#FFB14A" />
          <circle cx="16.2" cy="0" r="0.7" fill="#FF6A2A" />
        </g>

        <path d="M24 26c1.8 1.2 2.9 2.4 3.6 3.9" stroke="#E8D5A7" strokeOpacity="0.66" strokeWidth="1" strokeLinecap="round" />
        <path d="M56 26c-1.8 1.2-2.9 2.4-3.6 3.9" stroke="#E8D5A7" strokeOpacity="0.66" strokeWidth="1" strokeLinecap="round" />

        <path d="M14 52c4 7 9 10 16 11" stroke="#EBD5A7" strokeWidth="2" strokeLinecap="round" />
        <path d="M66 52c-4 7-9 10-16 11" stroke="#EBD5A7" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
