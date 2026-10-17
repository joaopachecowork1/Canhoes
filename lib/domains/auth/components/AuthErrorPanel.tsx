import { AlertTriangle } from "lucide-react";


/** Red panel at the top of the login and register forms. */
export function AuthErrorPanel({
  detail,
  message,
  title,
}: Readonly<{ detail?: string; message: string; title: string }>) {
  return (
    <div
      className="rounded-lg border px-3 py-3 text-sm text-[rgba(255,228,228,0.94)]"
      role="alert"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          <p className="text-xs text-[rgba(255,228,228,0.84)]">{message}</p>
          {detail ? <p className="text-xs text-[rgba(255,228,228,0.68)]">{detail}</p> : null}
        </div>
      </div>
    </div>
  );
}
