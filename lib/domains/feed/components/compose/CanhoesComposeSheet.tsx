"use client";

import { useRef } from "react";
import { useSession } from "next-auth/react";
import { Leaf } from "lucide-react";

import { useComposer } from "@/lib/domains/feed/hooks/useComposer";
import { usePublishPost } from "@/lib/domains/feed/hooks/usePublishPost";
import { useEventOverview } from "@/lib/domains/event/hooks/useEventOverview";
import { useAuth } from "@/components/providers/AuthContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import messages from "@/messages/pt.json";

import { isPollReady, MAX_MEDIA_FILES, MAX_POLL_OPTIONS } from "../../rules/composeRules";
import { ComposeMediaGrid } from "./ComposeMediaGrid";
import { ComposePollEditor } from "./ComposePollEditor";
import { ComposeToolbar } from "./ComposeToolbar";
import { ComposeUploadProgress } from "./ComposeUploadProgress";

const composeCopy = messages.feed.compose;

function ComposeSheetHeader() {
  return (
    <>
      <div className="flex shrink-0 justify-center pt-2 sm:hidden">
        <span className="h-1.5 w-14 rounded-full bg-white/20" />
      </div>
      <SheetHeader className="shrink-0 border-b border-white/10 px-4 pb-3 pt-3 sm:pt-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-moss)] text-[var(--ink-primary)]">
            <Leaf className="h-4 w-4" />
          </span>
          <div className="min-w-0 space-y-1 pr-9">
            <SheetTitle>{composeCopy.sheetTitle}</SheetTitle>
            <SheetDescription className="body-small text-[var(--ink-secondary)]">
              {composeCopy.sheetDescription}
            </SheetDescription>
          </div>
        </div>
      </SheetHeader>
    </>
  );
}

function ComposeAuthPrompt() {
  const { loginGoogle, loginDevelopment, isDevLoginAvailable } = useAuth();
  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
      <p className="body-small text-[var(--ink-secondary)]">{composeCopy.authPrompt}</p>
      <Button onClick={isDevLoginAvailable ? loginDevelopment : loginGoogle} className="w-full">
        {composeCopy.signIn}
      </Button>
    </div>
  );
}

function ComposeForm({ onPublished }: Readonly<{ onPublished: () => void }>) {
  const { event: activeEvent } = useEventOverview();
  const composer = useComposer();
  const { status, publish } = usePublishPost(activeEvent?.id ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { poll } = composer;
  const isSubmitting = status !== "idle";
  const canSubmit =
    composer.text.trim().length > 0 && (!poll.isEnabled || isPollReady(poll.question, poll.options)) && !isSubmitting;

  const handleFiles = async (fileList: FileList | null) => {
    await composer.addFiles(fileList);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    const isPublished = await publish({ text: composer.text, files: composer.files, poll });
    if (!isPublished) return;
    composer.reset();
    onPublished();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-3">
        <Textarea
          value={composer.text}
          onChange={(event) => composer.setText(event.target.value)}
          placeholder={composeCopy.textPlaceholder}
          className="min-h-24 resize-none border-white/10 bg-[var(--bg-paper-soft)] text-base sm:min-h-28 sm:text-sm"
        />

        <ComposeMediaGrid
          files={composer.files}
          maxFiles={MAX_MEDIA_FILES}
          previewUrls={composer.previewUrls}
          onMove={composer.moveFile}
          onRemove={composer.removeFile}
        />

        {isSubmitting && composer.files.length > 0 ? (
          <ComposeUploadProgress label={composeCopy.uploading} progress={status === "uploading" ? 0 : 100} />
        ) : null}

        {poll.isEnabled ? (
          <ComposePollEditor
            disabled={isSubmitting}
            maxOptions={MAX_POLL_OPTIONS}
            onAddOption={poll.addOption}
            onOptionChange={poll.changeOption}
            onQuestionChange={poll.setQuestion}
            onRemoveOption={poll.removeOption}
            options={poll.options}
            question={poll.question}
          />
        ) : null}
      </div>

      <ComposeToolbar
        canSubmit={canSubmit}
        fileCount={composer.files.length}
        isPollEnabled={poll.isEnabled}
        isSubmitting={isSubmitting}
        onPickImages={() => fileInputRef.current?.click()}
        onSubmit={() => void handleSubmit()}
        onTogglePoll={() => poll.setIsEnabled((isEnabled) => !isEnabled)}
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => void handleFiles(event.target.files)}
      />
    </div>
  );
}

/**
 * Bottom sheet to write a mural post with up to 4 images or a poll. The shell mounts it only while
 * open, so closing it drops the draft.
 */
export function CanhoesComposeSheet({
  open,
  onOpenChange,
  onDone,
}: Readonly<{
  open: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onDone?: () => void;
}>) {
  const { status } = useSession();

  const handlePublished = () => {
    onDone?.();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[92svh] flex-col gap-0 overflow-hidden border-t border-white/10 bg-[rgba(10,14,8,0.98)] p-0 pb-safe sm:mx-auto sm:mb-4 sm:max-h-[calc(100svh-2rem)] sm:max-w-2xl sm:rounded-[1.5rem] sm:border sm:border-white/10"
      >
        <ComposeSheetHeader />
        {status === "authenticated" ? <ComposeForm onPublished={handlePublished} /> : <ComposeAuthPrompt />}
      </SheetContent>
    </Sheet>
  );
}
