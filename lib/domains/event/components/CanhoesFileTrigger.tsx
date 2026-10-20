"use client";

import { Upload } from "lucide-react";

import { cn } from "@/lib/utils";

type CanhoesFileTriggerProps = {
  accept?: string;
  className?: string;
  fileName?: string | null;
  iconClassName?: string;
  onChange?: (file: File | null) => void;
  placeholder?: string;
};

/**
 * Trigger para upload de ficheiros com estilo Canhões.
 */
export function CanhoesFileTrigger({
  accept = "image/*",
  className,
  fileName,
  iconClassName,
  onChange,
  placeholder,
}: Readonly<CanhoesFileTriggerProps>) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-[var(--color-moss)]/20 px-4 py-3 text-sm font-semibold text-[var(--color-text-primary)]",
        className,
      )}
    >
      <Upload className={cn("h-4 w-4 text-[var(--color-text-secondary)]", iconClassName)} />
      <span className="truncate">{fileName ?? placeholder}</span>
      <input
        type="file"
        accept={accept}
        className="sr-only"
        onChange={(event) => onChange?.(event.target.files?.[0] ?? null)}
      />
    </label>
  );
}
