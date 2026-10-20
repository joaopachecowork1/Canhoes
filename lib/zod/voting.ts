import { z } from "zod";

/** Valida um voto: a categoria e a seleção escolhida. */
export const CreateEventVoteSchema = z.object({
  categoryId: z.string().min(1),
  selectionId: z.string().min(1),
});

/** Valida uma proposta de categoria (nome, descrição opcional e tipo numérico). */
export const CreateEventProposalSchema = z.object({
  name: z.string().min(1, "Name is required").max(128),
  description: z.string().max(1000).nullable().optional(),
  kind: z.number().int().optional().default(0),
});
