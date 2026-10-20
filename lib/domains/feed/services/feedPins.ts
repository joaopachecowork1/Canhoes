import { prisma } from "@/lib/prisma";

/** Fixa um post no fim da lista de fixados, ou desafixa-o; null quando o post não é deste evento. */
export async function togglePin(
  eventId: string,
  postId: string,
): Promise<{ pinned: boolean; pinnedOrder: number | null } | null> {
  // Transação: ler o estado e escrever a nova posição não podem ser separados por outro pedido.
  return prisma.$transaction(async (tx) => {
    const post = await tx.hubPost.findFirst({
      where: { id: postId, eventId },
      select: { isPinned: true },
    });
    if (!post) return null;

    const pinned = !post.isPinned;

    // Ao fixar, vai para o fim: uma posição depois do último fixado.
    const lastPinned = pinned
      ? await tx.hubPost.findFirst({
          where: { eventId, isPinned: true },
          orderBy: { pinnedOrder: "desc" },
          select: { pinnedOrder: true },
        })
      : null;
    const pinnedOrder = pinned ? (lastPinned?.pinnedOrder ?? -1) + 1 : null;

    await tx.hubPost.update({
      where: { id: postId },
      data: { isPinned: pinned, pinnedOrder },
    });

    return { pinned, pinnedOrder };
  });
}

/** Troca um post fixado com o vizinho de cima ou de baixo; false quando o post não está fixado. */
export async function movePinnedPost(eventId: string, postId: string, direction: "up" | "down"): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    // Fixados pela ordem atual (os empates desfazem-se pela data de criação).
    const pinnedPosts = await tx.hubPost.findMany({
      where: { eventId, isPinned: true },
      orderBy: [{ pinnedOrder: "asc" }, { createdAtUtc: "asc" }],
      select: { id: true },
    });

    const index = pinnedPosts.findIndex((post) => post.id === postId);
    if (index < 0) return false;

    // Já está no limite: nada a trocar, mas não é erro.
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= pinnedPosts.length) return true;

    // Renumera todos de 0 a n-1, trocando só as posições do post e do vizinho; assim a ordem fica sempre sem buracos.
    await Promise.all(
      pinnedPosts.map((post, position) => {
        let pinnedOrder = position;
        if (position === index) pinnedOrder = targetIndex;
        if (position === targetIndex) pinnedOrder = index;
        return tx.hubPost.update({ where: { id: post.id }, data: { pinnedOrder } });
      }),
    );
    return true;
  });
}
