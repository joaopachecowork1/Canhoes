import { z } from "zod";

/** Valida um item da lista de desejos; o link, se existir, tem de ser http(s). */
export const CreateWishlistItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(256),
  // É mostrado como link, por isso só endereços web: um link `javascript:` guardado correria na origem da app para quem clicasse.
  url: z
    .string()
    .trim()
    .max(1024)
    .regex(/^https?:\/\//i, "The link must start with http:// or https://")
    .nullable()
    .optional(),
  notes: z.string().max(2000).nullable().optional(),
});
