import type { HubCommentDto } from "@/lib/api/types";

export type CommentNode = HubCommentDto & {
  children: CommentNode[];
};

export type DisplayComment = HubCommentDto & {
  indentLevel: number;
  hasChildren: boolean;
};

/**
 * Reconstrói as relações de resposta para os comentários poderem ser mostrados em ordem de conversa.
 * Respostas cujo pai não existe ficam como comentários de topo.
 */
export function buildCommentTree(flatComments: HubCommentDto[]): CommentNode[] {
  const commentsById = new Map<string, CommentNode>();
  const rootComments: CommentNode[] = [];

  // primeiro indexa todos, para a ordem dos comentários não importar ao ligar pais e filhos
  flatComments.forEach((comment) => {
    commentsById.set(comment.id, { ...comment, children: [] });
  });

  // depois liga cada comentário ao pai
  flatComments.forEach((comment) => {
    const commentNode = commentsById.get(comment.id);
    const parentNode = comment.replyToId ? commentsById.get(comment.replyToId) : undefined;

    if (commentNode && parentNode) {
      parentNode.children.push(commentNode);
    } else if (commentNode) {
      rootComments.push(commentNode);
    }
  });

  return rootComments;
}

/**
 * Achata a árvore de comentários para a lista virtualizada, mantendo a indentação.
 * O limite de profundidade mantém conversas muito aninhadas legíveis em ecrãs pequenos.
 */
export function flattenCommentTree(commentTree: CommentNode[], nestingLevel = 0): DisplayComment[] {
  return commentTree.flatMap((comment) => [
    {
      ...comment,
      indentLevel: Math.min(nestingLevel, 4),
      hasChildren: comment.children.length > 0,
    },
    ...flattenCommentTree(comment.children, nestingLevel + 1),
  ]);
}
