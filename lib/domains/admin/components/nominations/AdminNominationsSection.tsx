"use client";

import { Button } from "@/components/ui/button";

import { logFrontendError } from "@/lib/errors";
import { AdminStateMessage } from "../layout/AdminStateMessage";
import { AdminNominationsView } from "./AdminNominationsView";
import { useAdminNominations } from "../../hooks/useAdminNominations";
import messages from "@/messages/pt.json";

const copy = messages.admin.AdminNominationsSection;

export function AdminNominationsSection({
  eventId,
  loading,
}: Readonly<{
  eventId: string | null;
  loading: boolean;
}>) {
  const nominations = useAdminNominations(eventId);

  if (!eventId) {
    return <AdminStateMessage>{copy.noEvent}</AdminStateMessage>;
  }

  if (loading || (nominations.isLoading && nominations.nominations.length === 0)) {
    return <AdminStateMessage>{copy.loading}</AdminStateMessage>;
  }

  if (nominations.error) {
    logFrontendError("AdminNominationsSection.query", nominations.error, { eventId });
    return (
      <AdminStateMessage
        tone="error"
        action={
          <Button onClick={() => void nominations.refresh()}>
            {messages.common.retry}
          </Button>
        }
      >
        {copy.loadError}
      </AdminStateMessage>
    );
  }

  return (
    <AdminNominationsView
      categories={nominations.categories}
      nominations={nominations.nominations}
      approveNomination={nominations.approveNomination}
      rejectNomination={nominations.rejectNomination}
      setNominationCategory={nominations.setNominationCategory}
      isMutationPending={nominations.isMutationPending}
    />
  );
}
