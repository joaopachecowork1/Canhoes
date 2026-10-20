"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trophy } from "lucide-react";
import { toast } from "sonner";

import { getErrorMessage, logFrontendError } from "@/lib/errors";
import { awardsRepo } from "@/lib/repositories/awardsRepo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import messages from "@/messages/pt.json";
import { queryKeys } from "@/lib/queryKeys";

const copy = messages.categories.CategoryProposalForm;
const MIN_NAME_LENGTH = 3;
const DEFAULT_KIND = "0";

function getSubmitLabel(isSubmitting: boolean, canPropose: boolean) {
  if (isSubmitting) return messages.common.sending;
  return canPropose ? copy.submit : copy.closed;
}

/** Form to propose a new official category; it only sends while proposals are open. */
export function CategoryProposalForm({ canPropose, eventId }: Readonly<{ canPropose: boolean; eventId: string | undefined }>) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState(DEFAULT_KIND);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = name.trim().length >= MIN_NAME_LENGTH && canPropose;

  const handleSubmit = async () => {
    if (!canSubmit || !eventId) return;

    setIsSubmitting(true);
    try {
      await awardsRepo.createCategoryProposal(eventId, {
        description: description.trim() || null,
        name: name.trim(),
        kind: Number.parseInt(kind, 10),
      });
      setName("");
      setDescription("");
      setKind(DEFAULT_KIND);
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories(eventId) });
      toast.success(copy.sent);
    } catch (error) {
      logFrontendError("CanhoesCategories.handleProposalSubmit", error, { eventId });
      toast.error(getErrorMessage(error, copy.sendError));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--person-amber)]/12">
            <Trophy className="h-4 w-4 text-[var(--person-amber)]" />
          </div>
          {copy.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="category-name-input">{copy.nameLabel}</label>
            <Input id="category-name-input" value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.namePlaceholder} />
          </div>

          <div className="space-y-2">
            <label htmlFor="category-kind-input">{copy.kindLabel}</label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger id="category-kind-input">
                <SelectValue placeholder={copy.kindPlaceholder} />
              </SelectTrigger>
              <SelectContent className="z-[100]">
                <SelectItem value="0">{copy.kindNominees}</SelectItem>
                <SelectItem value="1">{copy.kindMember}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label htmlFor="category-desc-input">{copy.descriptionLabel}</label>
            <Textarea
              id="category-desc-input"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={copy.descriptionPlaceholder}
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>{copy.reviewHint}</p>
          <Button disabled={!canSubmit || isSubmitting} onClick={() => void handleSubmit()}>
            {getSubmitLabel(isSubmitting, canPropose)}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
