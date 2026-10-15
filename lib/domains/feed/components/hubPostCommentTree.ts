import type { HubCommentDto } from "@/lib/api/types";

export type CommentNode = HubCommentDto & {
  children: CommentNode[];
};

export type DisplayComment = HubCommentDto & {
  indentLevel: number;
  hasChildren: boolean;
};

/**
 * Reconstructs reply relationships so comments can be rendered in thread order.
 * Replies whose parent is not present remain top-level comments.
 */
export function buildCommentTree(flatComments: HubCommentDto[]): CommentNode[] {
  const commentsById = new Map<string, CommentNode>();
  const rootComments: CommentNode[] = [];

  flatComments.forEach((comment) => {
    commentsById.set(comment.id, { ...comment, children: [] });
  });

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
 * Flattens a comment tree for the virtualized list while retaining indentation.
 * The depth cap keeps deeply nested conversations readable on small screens.
 */
export function flattenCommentTree(
  commentTree: CommentNode[],
  nestingLevel = 0
): DisplayComment[] {
  return commentTree.flatMap((comment) => [
    {
      ...comment,
      indentLevel: Math.min(nestingLevel, 4),
      hasChildren: comment.children.length > 0,
    },
    ...flattenCommentTree(comment.children, nestingLevel + 1),
  ]);
}
