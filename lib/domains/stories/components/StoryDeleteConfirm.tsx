import { Button } from "@/components/ui/button";
import messages from "@/messages/pt.json";

const copy = messages.stories.StoryViewer;

/** A confirmação de apagar, como um painel em baixo dentro do visualizador (um modal por cima ficaria atrás dele). */
export function StoryDeleteConfirm({ onCancel, onConfirm }: Readonly<{ onCancel: () => void; onConfirm: () => void }>) {
  return (
    <div
      role="alertdialog"
      aria-labelledby="story-delete-title"
      aria-describedby="story-delete-description"
      className="absolute inset-x-0 bottom-0 z-10 space-y-3 rounded-t-2xl bg-[var(--bg-surface)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-[var(--text-primary)] shadow-[var(--shadow-modal)]"
    >
      <h3 id="story-delete-title" className="text-lg font-semibold">
        {copy.deleteTitle}
      </h3>
      <p id="story-delete-description" className="text-base text-[var(--text-secondary)]">
        {copy.deleteDescription}
      </p>
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onCancel} autoFocus>
          {messages.common.cancel}
        </Button>
        <Button variant="destructive" className="flex-1" onClick={onConfirm}>
          {copy.confirmDelete}
        </Button>
      </div>
    </div>
  );
}
