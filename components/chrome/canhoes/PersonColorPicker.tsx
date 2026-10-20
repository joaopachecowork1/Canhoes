"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAuth } from "@/components/providers/AuthContext";
import { getErrorMessage } from "@/lib/errors";
import { PERSON_COLORS, personColorVar, type PersonColor } from "@/lib/personColors";
import { authRepo } from "@/lib/repositories/authRepo";
import messages from "@/messages/pt.json";
import { queryKeys } from "@/lib/queryKeys";

const copy = messages.shell.PersonColorPicker;

/** A paleta como uma fila de amostras; escolher uma grava-a e atualiza a sessão. */
export function PersonColorPicker() {
  const { user, refreshProfile } = useAuth();
  const queryClient = useQueryClient();
  const save = useMutation({
    mutationFn: (color: PersonColor) => authRepo.setMyColor(color),
    onSuccess: async () => {
      // Primeiro a sessão (o cromo do cabeçalho), depois as queries que mostram a cor de cada pessoa.
      await refreshProfile();
      await queryClient.invalidateQueries({ predicate: (query) => queryKeys.colorRoots.includes(query.queryKey[0]) });
    },
    onError: (error) => toast.error(getErrorMessage(error, copy.saveError)),
  });
  // Enquanto grava, mostra já a cor escolhida em vez de esperar pela sessão.
  const selected = save.isPending ? save.variables : user?.color;

  return (
    <fieldset className="px-3 pb-3">
      <legend className="pb-2 font-[family-name:var(--font-display)] text-sm font-bold uppercase tracking-wide text-[var(--color-text-muted)]">
        {copy.legend}
      </legend>
      <div className="flex flex-wrap gap-1">
        {PERSON_COLORS.map((color) => (
          <label
            key={color}
            className="flex size-11 cursor-pointer items-center justify-center rounded-xl has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--moss-glow)]"
          >
            <input
              type="radio"
              name="person-color"
              value={color}
              aria-label={copy.colors[color]}
              checked={selected === color}
              onChange={() => save.mutate(color)}
              className="peer sr-only"
            />
            <span
              aria-hidden
              className="size-8 rounded-lg border-4 border-transparent transition-transform peer-checked:scale-110 peer-checked:border-[var(--color-text-primary)]"
              style={{ backgroundColor: personColorVar(color) }}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
