import { useState } from "react";

/** O fluxo de apagar uma story: perguntar (`ask`), apagar ao confirmar e avisar com `onDeleted`; `isBusy` até acabar. */
export function useStoryDeletion({
  onDelete,
  onDeleted,
}: Readonly<{ onDelete: (storyId: string) => Promise<boolean>; onDeleted: (storyId: string) => void }>) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const confirm = async () => {
    const storyId = confirmingId;
    setConfirmingId(null);
    if (!storyId) return;
    setIsDeleting(true);
    try {
      if (await onDelete(storyId)) onDeleted(storyId);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancel = () => setConfirmingId(null);

  /** Com a confirmação aberta, Escape só a fecha a ela em vez de fechar o visualizador. */
  const interceptEscape = (event: { preventDefault: () => void }) => {
    if (!confirmingId) return;
    event.preventDefault();
    cancel();
  };

  /** Protege uma ação que muda de story: com a confirmação aberta só a fecha, e com o apagar a correr não faz nada. */
  const unlessBusy = (action: () => void) => () => {
    if (confirmingId) cancel();
    else if (!isDeleting) action();
  };

  return {
    confirmingId,
    isBusy: confirmingId !== null || isDeleting,
    ask: setConfirmingId,
    cancel,
    confirm,
    interceptEscape,
    unlessBusy,
  };
}
