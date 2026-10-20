import { z } from "zod";

export const CreateWishlistItemSchema = z.object({
  title: z.string().min(1, "Title is required").max(256),
  // Shown as a link, so only web addresses: a stored `javascript:` link would run in the app's origin for whoever clicks it.
  url: z.string().trim().max(1024).regex(/^https?:\/\//i, "The link must start with http:// or https://").nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
