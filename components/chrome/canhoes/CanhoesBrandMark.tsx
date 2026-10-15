import { cn } from "@/lib/utils";
import { CanhoesBrandIcon } from "./CanhoesBrandIcon";

type CanhoesBrandMarkProps = {
  className?: string;
  compact?: boolean;
  subtitle?: string;
};

export function CanhoesBrandMark({
  className,
  compact = false,
  subtitle = "Premiando a comunidade",
}: Readonly<CanhoesBrandMarkProps>) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <CanhoesBrandIcon size="sm" />

      <div className="min-w-0">
        <p className="truncate font-[var(--font-display)] text-[1.06rem] font-bold uppercase tracking-[0.03em] text-canhoes-gold">
          Canhões do Ano
        </p>
        {compact ? null : (
          <p className="truncate font-[var(--font-mono)] text-[0.64rem] uppercase tracking-[0.16em] text-[rgba(255,255,255,0.74)]">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
