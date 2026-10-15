import * as React from "react"

import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-[var(--focus-visible-ring-color)] peer-focus-visible:rounded-md peer-focus-visible:outline-offset-2 peer-focus-visible:outline-1",
        className
      )}
      {...props}
    />
  )
}

export { Label }
