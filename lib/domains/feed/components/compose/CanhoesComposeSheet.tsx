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
import { ComposeGatheringEditor } from "./ComposeGatheringEditor";
import { ComposeMediaGrid } from "./ComposeMediaGrid";
import { ComposePollEditor } from "./ComposePollEditor";
import { ComposeToolbar } from "./ComposeToolbar";
import { ComposeUploadProgress } from "./ComposeUploadProgress";

const composeCopy = messages.feed.compose;

/** Cabeçalho da folha de publicação, com a pega de arrastar em ecrãs pequenos. */
function ComposeSheetHeader() {
  return (
    <>
      <div className="flex shrink-0 justify-center pt-2 sm:hidden">
        <span className="h-1.5 w-14 rounded-full bg-[var(--color-veil)]/20" />
      </div>
      <SheetHeader className="shrink-0 border-b border-[var(--color-veil)]/10 px-4 pb-3 pt-3 sm:pt-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-moss)] text-[var(--on-moss)]">
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

/** Convite para iniciar sessão, mostrado a quem ainda não a tem. */
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

function useComposeFormSubmit(
  composer: ReturnType<typeof useComposer>,
  eventId: string | null,
  onPublished: () => void,
) {
  const { status, publish } = usePublishPost(eventId);
  const { poll, gathering } = composer;
  const isSubmitting = status !== "idle";

  const hasContent = composer.text.trim().length > 0 || (gathering.isEnabled && gathering.title.trim().length > 0);
  const canSubmit = hasContent && (!poll.isEnabled || isPollReady(poll.question, poll.options)) && !isSubmitting;

  const handleSubmit = async () => {
    const text = composer.text.trim() || (gathering.isEnabled ? gathering.title : "");
    const isPublished = await publish({ text, files: composer.files, poll, gathering });
    if (!isPublished) return;
    composer.reset();
    onPublished();
  };

  return { canSubmit, handleSubmit, isSubmitting, status };
}

function ComposeFormGathering({
  eventId,
  gathering,
}: Readonly<{
  eventId: string | undefined;
  gathering: ReturnType<typeof useComposer>["gathering"];
}>) {
  if (!gathering.isEnabled) return null;
  return (
    <ComposeGatheringEditor
      eventId={eventId}
      title={gathering.title}
      onTitleChange={gathering.setTitle}
      location={gathering.location}
      onLocationChange={gathering.setLocation}
      locationAddress={gathering.locationAddress}
      onSelectPlace={gathering.selectPlace}
      description={gathering.description}
      onDescriptionChange={gathering.setDescription}
      dates={gathering.dates}
      onDateChange={gathering.changeDate}
      onAddDate={gathering.addDate}
      onRemoveDate={gathering.removeDate}
    />
  );
}

/** O formulário de publicação: texto, imagens e sondagem, com os botões de ação. */
function ComposeForm({ onPublished }: Readonly<{ onPublished: () => void }>) {
  const { event: activeEvent } = useEventOverview();
  const { user } = useAuth();
  const isAdmin = Boolean(user?.isAdmin);
  const composer = useComposer();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { canSubmit, handleSubmit, isSubmitting, status } = useComposeFormSubmit(
    composer,
    activeEvent?.id ?? null,
    onPublished,
  );
  const { poll, gathering } = composer;

  const handleFiles = async (fileList: FileList | null) => {
    await composer.addFiles(fileList);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-3">
        <Textarea
          value={composer.text}
          onChange={(event) => composer.setText(event.target.value)}
          placeholder={composeCopy.textPlaceholder}
          className="min-h-24 resize-none border-[var(--color-veil)]/10 bg-[var(--bg-paper-soft)] text-base sm:min-h-28 sm:text-sm"
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

        <ComposeFormGathering eventId={activeEvent?.id} gathering={gathering} />
      </div>

      <ComposeToolbar
        canSubmit={canSubmit}
        fileCount={composer.files.length}
        isPollEnabled={poll.isEnabled}
        isAdmin={isAdmin}
        isGatheringEnabled={gathering.isEnabled}
        isSubmitting={isSubmitting}
        onPickImages={() => fileInputRef.current?.click()}
        onSubmit={() => void handleSubmit()}
        onTogglePoll={() => poll.setIsEnabled((isEnabled) => !isEnabled)}
        onToggleGathering={() => gathering.setIsEnabled((isEnabled) => !isEnabled)}
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

/** Folha inferior para escrever um post do mural com até 4 imagens ou uma sondagem. */
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
        className="flex max-h-[92svh] flex-col gap-0 overflow-hidden border-t border-[var(--color-veil)]/10 bg-[var(--color-panel)]/98 p-0 pb-safe sm:mx-auto sm:mb-4 sm:max-h-[calc(100svh-2rem)] sm:max-w-2xl sm:rounded-[1.5rem] sm:border sm:border-[var(--color-veil)]/10"
      >
        <ComposeSheetHeader />
        {status === "authenticated" ? <ComposeForm onPublished={handlePublished} /> : <ComposeAuthPrompt />}
      </SheetContent>
    </Sheet>
  );
}
