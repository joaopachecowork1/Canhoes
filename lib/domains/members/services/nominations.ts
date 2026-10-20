import { prisma } from "@/lib/prisma";
import { ProposalStatusSchema } from "@/lib/zod/common";
import { deleteUpload, saveUpload } from "@/lib/storage/localStorage";
import type { MyNominationDto, NomineeDto } from "@/lib/api/types";

/* Nomeações e cromos: o que o membro submeteu, o que está aprovado e as imagens dos nomeados. As guardas das rotas decidem quem pode chamar cada função. */

/** Os campos de um nomeado que o DTO precisa. */
type NomineeRow = {
  id: string;
  categoryId: string | null;
  title: string;
  imageUrl: string | null;
  status: string;
  createdAtUtc: Date;
};

/** Converte um nomeado da BD no DTO da API. */
function toNomineeDto(nominee: NomineeRow): NomineeDto {
  return {
    id: nominee.id,
    categoryId: nominee.categoryId,
    title: nominee.title,
    imageUrl: nominee.imageUrl,
    status: ProposalStatusSchema.parse(nominee.status),
    createdAtUtc: nominee.createdAtUtc.toISOString(),
  };
}

/** Nomeações do utilizador no evento, a mais recente por categoria (os cromos não são nomeações). */
export async function getMyNominations(eventId: string, userId: string): Promise<MyNominationDto[]> {
  const nominees = await prisma.nominee.findMany({
    where: { eventId, submittedByUserId: userId, submissionKind: "nominees" },
    orderBy: { createdAtUtc: "desc" },
    distinct: ["categoryId"],
  });

  return nominees.map((nominee) => ({
    categoryId: nominee.categoryId,
    status: ProposalStatusSchema.parse(nominee.status),
    nomineeId: nominee.id,
    nomineeTitle: nominee.title,
  }));
}

/** Nomeações aprovadas do evento, das mais recentes para as mais antigas. */
export async function getApprovedNominees(eventId: string): Promise<NomineeDto[]> {
  const nominees = await prisma.nominee.findMany({
    where: { eventId, status: "approved" },
    orderBy: { createdAtUtc: "desc" },
  });

  return nominees.map(toNomineeDto);
}

/** Regista uma nomeação (ou um cromo, com `kind: "stickers"`) como `pending`, para o admin moderar. */
export async function createNomination(
  eventId: string,
  userId: string,
  data: { title: string; categoryId?: string | null; kind?: string | null; targetUserId?: string | null },
): Promise<NomineeDto> {
  // Nasce sempre pendente e sem imagem; a imagem é enviada depois.
  const nominee = await prisma.nominee.create({
    data: {
      eventId,
      submittedByUserId: userId,
      title: data.title.trim(),
      categoryId: data.categoryId ?? null,
      submissionKind: data.kind?.trim().toLowerCase() === "stickers" ? "stickers" : "nominees",
      imageUrl: null,
      status: "pending",
    },
  });

  return toNomineeDto(nominee);
}

/** Guarda uma nova imagem para um nomeado do próprio autor (ou de um admin); o upload anterior é apagado. */
export async function replaceNomineeImage(
  eventId: string,
  nomineeId: string,
  user: { id: string; isAdmin: boolean },
  file: File,
): Promise<NomineeDto | null> {
  // Só o autor ou um admin pode mudar a imagem; devolve null se não existir ou não for permitido.
  const nominee = await prisma.nominee.findFirst({ where: { id: nomineeId, eventId } });
  if (!nominee || (nominee.submittedByUserId !== user.id && !user.isAdmin)) return null;

  const upload = await saveUpload(file, ["canhoes", "nominees"]);
  const updated = await prisma.nominee.update({
    where: { id: nomineeId },
    data: { imageUrl: upload.url },
  });
  // Só apaga a imagem antiga depois de a nova estar gravada, para nunca ficar sem imagem.
  if (nominee.imageUrl) await deleteUpload(nominee.imageUrl);

  return toNomineeDto(updated);
}
