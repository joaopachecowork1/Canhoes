import { cn } from "@/lib/utils";
import { CanhoesBrandIcon } from "./CanhoesBrandIcon";
import messages from "@/messages/pt.json";

const copy = messages.shell.CanhoesBrandMark;

type CanhoesBrandMarkProps = {
  className?: string;
  compact?: boolean;
  subtitle?: string;
};

/** Logo plus the app name, as shown in the header. */
export function CanhoesBrandMark({
  className,
  compact = false,
  subtitle = copy.subtitle,
}: Readonly<CanhoesBrandMarkProps>) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <CanhoesBrandIcon size="sm" />

      <div className="min-w-0">
        <p className="truncate font-[family-name:var(--font-display)] text-base font-bold uppercase leading-tight text-canhoes-gold">
          {messages.common.appName}
        </p>
        {compact ? null : (
          <p className="truncate font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.08em] text-[var(--text-secondary)]">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
