import { cn } from "@/lib/utils";

/** Bloco cinzento com brilho para marcar o sítio de conteúdo que ainda está a carregar. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("skeleton-shimmer rounded-md", className)} {...props} />;
}

export { Skeleton };
