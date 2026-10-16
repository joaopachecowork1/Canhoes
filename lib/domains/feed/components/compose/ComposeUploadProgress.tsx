"use client";

export function ComposeUploadProgress({
  label,
  progress,
}: Readonly<{
  label: string;
  progress: number;
}>) {
  return (
    <div className="space-y-2 rounded-2xl border border-[var(--color-beige-dark)]/25 bg-[var(--color-bg-surface-alt)] p-3">
      <div className="flex items-center justify-between text-xs font-medium text-[var(--text-primary)]">
        <span>{label}</span>
        <span>{progress}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 overflow-hidden rounded-[var(--radius-sm-token)] bg-[rgba(61,43,24,0.16)]"
      >
        <div
          className="h-full w-full bg-[var(--moss)] transition-transform"
          style={{ transform: `translateX(-${100 - progress}%)` }}
        />
      </div>
    </div>
  );
}
