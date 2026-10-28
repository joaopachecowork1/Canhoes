import { Pause, Play, Trash2, X } from "lucide-react";

import { PersonCromo } from "@/components/ui/person-cromo";
import { Button } from "@/components/ui/button";
import { useRelativeTime } from "@/lib/postUtils";
import messages from "@/messages/pt.json";

const copy = messages.stories.StoryViewer;

/** O topo do visualizador: quem publicou e há quanto tempo, pausa, apagar (se puder) e fechar. */
export function StoryViewerHeader({
  authorName,
  authorColor,
  createdAtUtc,
  isPaused,
  canDelete,
  onTogglePause,
  onDelete,
  onClose,
}: Readonly<{
  authorName: string;
  authorColor: string;
  createdAtUtc: string;
  isPaused: boolean;
  canDelete: boolean;
  onTogglePause: () => void;
  onDelete: () => void;
  onClose: () => void;
}>) {
  const age = useRelativeTime(createdAtUtc);

  return (
    <div className="flex items-center gap-3 px-3 py-2">
      <PersonCromo name={authorName} color={authorColor} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-[var(--text-primary)]">{authorName}</p>
        <p className="text-base text-[var(--text-secondary)]">{age}</p>
      </div>
      <Button variant="ghost" size="icon" onClick={onTogglePause} aria-label={isPaused ? copy.play : copy.pause}>
        {isPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      </Button>
      {canDelete ? (
        <Button variant="ghost" size="icon" onClick={onDelete} aria-label={copy.delete}>
          <Trash2 aria-hidden="true" />
        </Button>
      ) : null}
      <Button variant="ghost" size="icon" onClick={onClose} aria-label={copy.close}>
        <X aria-hidden="true" />
      </Button>
    </div>
  );
}
