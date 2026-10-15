import { describe, expect, it } from "vitest";

import { DELETE as deleteComment } from "@/app/api/v1/events/[eventId]/feed/posts/[postId]/comments/[commentId]/route";
import { GET as getComments } from "@/app/api/v1/events/[eventId]/feed/posts/[postId]/comments/route";
import { POST as likePost } from "@/app/api/v1/events/[eventId]/feed/posts/[postId]/like/route";
import { POST as votePoll } from "@/app/api/v1/events/[eventId]/feed/posts/[postId]/poll/vote/route";
import { DELETE as deleteWishlistItem } from "@/app/api/v1/events/[eventId]/wishlist/[itemId]/route";
import { GET as getUpload } from "@/app/api/uploads/[...path]/route";
import { prisma } from "@/lib/prisma";

import { callRoute, createEvent, createMember, signInAs } from "./helpers";

/** IDOR checks: ids from another event, post or user must not be reachable through this event's routes. */

async function createPost(eventId: string, authorUserId: string) {
  return prisma.hubPost.create({ data: { eventId, authorUserId, text: "Olá", isPinned: false } });
}

async function setupTwoEvents() {
  const event = await createEvent();
  const otherEvent = await createEvent();
  const member = await createMember(event.id);
  const outsider = await createMember(otherEvent.id);
  signInAs(member);
  return { event, otherEvent, member, outsider };
}

describe("feed", () => {
  it("does not let a member like or read comments of another event's post", async () => {
    const { event, otherEvent, outsider } = await setupTwoEvents();
    const foreignPost = await createPost(otherEvent.id, outsider.id);

    const like = await callRoute(likePost, { eventId: event.id, postId: foreignPost.id }, { method: "POST" });
    const comments = await callRoute(getComments, { eventId: event.id, postId: foreignPost.id });

    expect(like.status).toBe(404);
    expect(comments.status).toBe(404);
    expect(await prisma.hubPostLike.count()).toBe(0);
  });

  it("does not let a member delete someone else's comment, or one from another post", async () => {
    const { event, member } = await setupTwoEvents();
    const colleague = await createMember(event.id);
    const post = await createPost(event.id, member.id);
    const otherPost = await createPost(event.id, member.id);
    const colleagueComment = await prisma.hubPostComment.create({ data: { postId: post.id, userId: colleague.id, text: "meu" } });
    const ownComment = await prisma.hubPostComment.create({ data: { postId: otherPost.id, userId: member.id, text: "meu" } });

    const notOwner = await callRoute(deleteComment, { eventId: event.id, postId: post.id, commentId: colleagueComment.id }, { method: "DELETE" });
    const wrongPost = await callRoute(deleteComment, { eventId: event.id, postId: post.id, commentId: ownComment.id }, { method: "DELETE" });

    expect(notOwner.status).toBe(404);
    expect(wrongPost.status).toBe(404);
    expect(await prisma.hubPostComment.count()).toBe(2);
  });

  it("does not accept a poll option that belongs to another post", async () => {
    const { event, member } = await setupTwoEvents();
    const post = await createPost(event.id, member.id);
    const otherPost = await createPost(event.id, member.id);
    await prisma.hubPostPoll.create({ data: { postId: post.id, question: "?", options: { create: [{ text: "Sim", sortOrder: 0 }] } } });
    const otherPoll = await prisma.hubPostPoll.create({
      data: { postId: otherPost.id, question: "?", options: { create: [{ text: "Não", sortOrder: 0 }] } },
      include: { options: true },
    });

    const response = await callRoute(votePoll, { eventId: event.id, postId: post.id }, { method: "POST", body: { optionId: otherPoll.options[0].id } });

    expect(response.status).toBe(404);
    expect(await prisma.hubPostPollVote.count()).toBe(0);
  });
});

describe("wishlist", () => {
  it("only lets the owner delete an item", async () => {
    const { event } = await setupTwoEvents();
    const colleague = await createMember(event.id);
    const item = await prisma.wishlistItem.create({ data: { eventId: event.id, userId: colleague.id, title: "Livro" } });

    const response = await callRoute(deleteWishlistItem, { eventId: event.id, itemId: item.id }, { method: "DELETE" });

    expect(response.status).toBe(404);
    expect(await prisma.wishlistItem.count()).toBe(1);
  });

  it("does not reach another event's items through this event", async () => {
    const { event, otherEvent, member } = await setupTwoEvents();
    await createMember(otherEvent.id).then(() => prisma.eventMember.create({
      data: { eventId: otherEvent.id, userId: member.id, role: "participant", joinedAtUtc: new Date() },
    }));
    const item = await prisma.wishlistItem.create({ data: { eventId: otherEvent.id, userId: member.id, title: "Livro" } });

    const response = await callRoute(deleteWishlistItem, { eventId: event.id, itemId: item.id }, { method: "DELETE" });

    expect(response.status).toBe(404);
    expect(await prisma.wishlistItem.count()).toBe(1);
  });
});

describe("uploads", () => {
  it.each([
    [["..", "..", "package.json"]],
    [["..", ".env"]],
    [["%2e%2e", "package.json"]],
  ])("refuses to serve files outside the uploads folder: %j", async (segments) => {
    const response = await callRoute(getUpload, { path: segments });
    expect([400, 404]).toContain(response.status);
  });
});
