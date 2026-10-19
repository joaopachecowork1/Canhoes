"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import messages from "@/messages/pt.json"

function Sheet({ ...props }: Readonly<React.ComponentProps<typeof SheetPrimitive.Root>>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({
  ...props
}: Readonly<React.ComponentProps<typeof SheetPrimitive.Portal>>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      className={cn("fixed inset-0 z-[80] bg-[var(--color-panel)]/68 backdrop-blur-sm data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0", className)}
      style={{ willChange: "opacity" }}
      {...props}
    />
  )
}

function SheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left"
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn("fixed z-[90] flex flex-col gap-4 border shadow-[var(--shadow-modal)] transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-200", side === "right" && "inset-y-0 right-0 h-full w-[85vw] border-l border-[var(--color-veil)]/8 bg-[var(--bg-surface)] text-[var(--color-text-primary)] data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm", side === "left" && "inset-y-0 left-0 h-full w-[85vw] border-r border-[var(--color-veil)]/8 bg-[var(--bg-surface)] text-[var(--color-text-primary)] data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm", side === "top" && "inset-x-0 top-0 h-auto border-b border-[var(--color-veil)]/8 bg-[var(--bg-surface)] text-[var(--color-text-primary)] data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top", side === "bottom" && "inset-x-0 bottom-0 h-auto rounded-t-[1.75rem] border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom", className)}
        {...props}
      >
        {children}
        <SheetClose className="absolute right-4 top-4 rounded-full border border-[var(--color-veil)]/8 bg-[var(--color-veil)]/5 p-2 text-[var(--color-text-primary)] opacity-90 transition-[opacity,transform,background-color] hover:scale-[1.02] hover:bg-[var(--color-veil)]/8 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--moss)] disabled:pointer-events-none">
          <XIcon className="size-4" />
          <span className="sr-only">{messages.common.close}</span>
        </SheetClose>
      </SheetPrimitive.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 px-4 pt-5", className)}
      {...props}
    />
  )
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      className={cn("heading-2 text-[var(--text-primary)]", className)}
      {...props}
    />
  )
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("body-small text-[var(--color-text-muted)]", className)}
      {...props}
    />
  )
}

export {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
}
