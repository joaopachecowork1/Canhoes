import { cn } from "@/lib/utils";
import { CanhoesBrandIcon } from "./CanhoesBrandIcon";

type CanhoesHeroEmblemProps = {
  className?: string;
  compact?: boolean;
};

/** The large emblem on the login and register pages. */
export function CanhoesHeroEmblem({
  className,
  compact = false,
}: Readonly<CanhoesHeroEmblemProps>) {
  return (
    <CanhoesBrandIcon
      size={compact ? "md" : "lg"}
      className={cn(compact ? "rounded-[12px]" : "rounded-[16px]", className)}
    />
  );
}
