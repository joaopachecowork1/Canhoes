import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/errors";
import messages from "@/messages/pt.json";

/** Escrita de admin que avisa o resultado com um toast; `onSuccess` serve para invalidar queries. */
export function useAdminMutation<TData, TVariables = void>({
  mutationFn,
  onSuccess,
  successMessage,
}: {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess: () => unknown;
  successMessage: string;
}) {
  return useMutation({
    mutationFn,
    onSuccess: () => {
      toast.success(successMessage);
      void onSuccess();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, messages.admin.useAdminMutation.error));
    },
  });
}
