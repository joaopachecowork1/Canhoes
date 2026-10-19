import { Plus } from "lucide-react";

import { OPEN_COMPOSE_SHEET_EVENT } from "@/lib/canhoesEvent";
import messages from "@/messages/pt.json";

/** An empty album slot that opens the composer, the same one as the dock's Post button. */
export function FeedComposeSlot() {
  return (
    <button
      type="button"
      onClick={() => globalThis.dispatchEvent(new Event(OPEN_COMPOSE_SHEET_EVENT))}
      className="flex min-h-16 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--border-moss)] text-base font-bold text-[var(--moss-glow)] transition-colors hover:bg-[var(--bg-paper)]"
    >
      <Plus className="size-5" aria-hidden />
      {messages.feed.HubFeedModule.composeSlot}
    </button>
  );
}
