import * as Dialog from "@radix-ui/react-dialog";

import { formatMessage } from "@/lib/messages";
import messages from "@/messages/pt.json";

const copy = messages.stories.StoryViewer;

/** O título do diálogo e o anúncio, só para leitores de ecrã, de quem publicou e da story em que se está. */
export function StoryAnnouncements({
  authorName,
  current,
  total,
}: Readonly<{ authorName: string; current: number; total: number }>) {
  return (
    <>
      <Dialog.Title className="sr-only">{formatMessage(copy.title, { name: authorName })}</Dialog.Title>
      <p className="sr-only" aria-live="polite">
        {formatMessage(copy.progress, { name: authorName, current, total })}
      </p>
    </>
  );
}
