import { z } from "zod";

// A media é sempre um upload nosso, com a forma exata que `saveUpload` produz: sem pontos, tabs nem codificações que um browser possa transformar noutro caminho.
const uploadedMediaUrl = z
  .string()
  .max(1024)
  .regex(/^\/(api\/)?uploads\/feed(\/[A-Za-z0-9_-]+)+\.(jpe?g|png|gif|webp)$/, "Media must be an uploaded file.");

/** Valida a criação de um post: texto, até 4 imagens nossas e uma sondagem opcional (pergunta e 2 a 6 opções únicas). */
export const CreateFeedPostSchema = z
  .object({
    text: z.string().trim().min(1, "Text is required").max(4000),
    mediaUrl: uploadedMediaUrl.nullable().optional(),
    mediaUrls: z.array(uploadedMediaUrl).max(4).nullable().optional(),
    pollQuestion: z.string().trim().max(512).nullable().optional(),
    pollOptions: z.array(z.string().trim().min(1).max(256)).max(6).nullable().optional(),
  })
  .strict()
  .superRefine((post, context) => {
    // A sondagem é tudo ou nada: pergunta e opções têm de vir juntas.
    const hasQuestion = Boolean(post.pollQuestion);
    const options = post.pollOptions ?? [];
    if (hasQuestion && options.length < 2) {
      context.addIssue({
        code: "custom",
        message: "A poll requires at least two options.",
        path: ["pollOptions"],
      });
    }
    if (!hasQuestion && options.length > 0) {
      context.addIssue({
        code: "custom",
        message: "A poll question is required.",
        path: ["pollQuestion"],
      });
    }
    // As opções são comparadas sem distinguir maiúsculas de minúsculas.
    if (new Set(options.map((option) => option.toLocaleLowerCase())).size !== options.length) {
      context.addIssue({
        code: "custom",
        message: "Poll options must be unique.",
        path: ["pollOptions"],
      });
    }
  });

/** Valida um comentário, opcionalmente em resposta a outro comentário. */
export const CreateFeedCommentSchema = z.object({
  text: z.string().min(1, "Text is required").max(2000),
  replyToId: z.string().uuid().nullable().optional(),
});

/** Valida a reação a um post; sem `emoji` aplica-se a reação por defeito. */
export const ToggleFeedReactionSchema = z.object({
  emoji: z.string().max(16).optional(),
});

/** Valida o voto numa opção de sondagem. */
export const VoteFeedPollSchema = z.object({
  optionId: z.string().min(1, "optionId is required"),
});
