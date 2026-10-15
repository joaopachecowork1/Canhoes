"use client";

import { Button } from "@/components/ui/button";

import { logFrontendError } from "@/lib/errors";
import { ADMIN_OUTLINE_BUTTON_CLASS } from "../adminContentUi";
import { AdminStateMessage } from "../layout/AdminStateMessage";
import { AdminNominationsView } from "./AdminNominationsView";
import { useAdminNominations } from "./useAdminNominations";

export function AdminNominationsSection({
  eventId,
  loading,
}: Readonly<{
  eventId: string | null;
  loading: boolean;
}>) {
  const nominations = useAdminNominations(eventId);

  if (!eventId) {
    return <AdminStateMessage>Falta uma edição ativa para moderar nomeações.</AdminStateMessage>;
  }

  if (loading || (nominations.isLoading && nominations.nominations.length === 0)) {
    return <AdminStateMessage>A carregar nomeações...</AdminStateMessage>;
  }

  if (nominations.error) {
    logFrontendError("AdminNominationsSection.query", nominations.error, { eventId });
    return (
      <AdminStateMessage
        tone="error"
        action={
          <Button onClick={() => void nominations.refresh()} className={ADMIN_OUTLINE_BUTTON_CLASS}>
            Tentar novamente
          </Button>
        }
      >
        Não foi possível carregar as nomeações.
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
