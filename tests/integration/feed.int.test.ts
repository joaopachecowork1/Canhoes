import { describe, expect, it } from "vitest";

import {
  GET as getComments,
  POST as postComment,
} from "@/app/api/v1/events/[eventId]/feed/posts/[postId]/comments/route";
import { DELETE as deleteComment } from "@/app/api/v1/events/[eventId]/feed/posts/[postId]/comments/[commentId]/route";
import { POST as reactToComment } from "@/app/api/v1/events/[eventId]/feed/posts/[postId]/comments/[commentId]/reactions/route";
import { POST as downvotePost } from "@/app/api/v1/events/[eventId]/feed/posts/[postId]/downvote/route";
import { POST as likePost } from "@/app/api/v1/events/[eventId]/feed/posts/[postId]/like/route";
import { PATCH as movePin, POST as togglePin } from "@/app/api/v1/events/[eventId]/feed/posts/[postId]/pin/route";
import { POST as reactToPost } from "@/app/api/v1/events/[eventId]/feed/posts/[postId]/reactions/route";
import { DELETE as deletePost } from "@/app/api/v1/events/[eventId]/feed/posts/[postId]/route";
import { GET as getPosts, POST as createPost } from "@/app/api/v1/events/[eventId]/feed/posts/route";
import type { EventFeedPostFullDto, HubCommentDto, PagedResult } from "@/lib/api/types";
import { getFeedPosts } from "@/lib/domains/feed/services/feedPosts";
import { prisma } from "@/lib/prisma";

import { callRoute, createEvent, createMember, createUser, signInAs } from "./helpers";

async function setupFeed() {
  const event = await createEvent();
  const ana = await createMember(event.id, "Ana");
  const rui = await createMember(event.id, "Rui");
  const admin = await createUser({ isAdmin: true });
  return { event, ana, rui, admin };
}

async function postAs(user: { id: string; isAdmin: boolean }, eventId: string, body: Record<string, unknown>) {
  signInAs(user);
  const response = await callRoute(createPost, { eventId }, { method: "POST", body });
  return response.body as EventFeedPostFullDto;
}

async function readFeed(eventId: string) {
  const response = await callRoute(getPosts, { eventId });
  return response.body as PagedResult<EventFeedPostFullDto>;
}

describe("feed posts", () => {
  it("creates a post with a poll and lists it with its author", async () => {
    const { event, ana } = await setupFeed();

    const created = await postAs(ana, event.id, {
      text: "  Jantar?  ",
      pollQuestion: "Onde?",
      pollOptions: ["Tasca", "Pizza"],
    });

    expect(created).toMatchObject({ text: "Jantar?", authorName: "Ana", poll: { question: "Onde?", totalVotes: 0 } });
    const feed = await readFeed(event.id);
    expect(feed).toMatchObject({ total: 1, hasMore: false });
    expect(feed.items[0]?.poll?.options.map((option) => option.text)).toEqual(["Tasca", "Pizza"]);
  });

  it("only accepts media that was uploaded here", async () => {
    const { event, ana } = await setupFeed();
    signInAs(ana);

    const response = await callRoute(
      createPost,
      { eventId: event.id },
      { method: "POST", body: { text: "Foto", mediaUrls: ["https://tracker.example/pixel.png"] } },
    );

    expect(response.status).toBe(400);
  });

  it("rejects a poll with a single option", async () => {
    const { event, ana } = await setupFeed();
    signInAs(ana);

    const response = await callRoute(
      createPost,
      { eventId: event.id },
      { method: "POST", body: { text: "Hm", pollQuestion: "?", pollOptions: ["Só"] } },
    );
    expect(response.status).toBe(400);
  });

  it("links the uploaded images of the author to the post", async () => {
    const { event, ana } = await setupFeed();
    await prisma.hubPostMedia.create({
      data: {
        url: "/uploads/feed/a.jpg",
        originalFileName: "a.jpg",
        fileSizeBytes: BigInt(10),
        uploadedByUserId: ana.id,
        contentType: "image/jpeg",
        uploadedAtUtc: new Date(),
      },
    });

    const created = await postAs(ana, event.id, { text: "Foto", mediaUrls: ["/uploads/feed/a.jpg"] });

    expect(created.mediaUrls).toEqual(["/uploads/feed/a.jpg"]);
    expect(await prisma.hubPostMedia.findFirst({ select: { postId: true } })).toEqual({ postId: created.id });
  });

  it("puts pinned posts first and moves them in order", async () => {
    const { event, ana, admin } = await setupFeed();
    const first = await postAs(ana, event.id, { text: "Primeiro" });
    const second = await postAs(ana, event.id, { text: "Segundo" });
    await postAs(ana, event.id, { text: "Terceiro" });

    signInAs(admin);
    expect((await callRoute(togglePin, { eventId: event.id, postId: first.id }, { method: "POST" })).body).toEqual({
      pinned: true,
      pinnedOrder: 0,
    });
    expect((await callRoute(togglePin, { eventId: event.id, postId: second.id }, { method: "POST" })).body).toEqual({
      pinned: true,
      pinnedOrder: 1,
    });
    await callRoute(movePin, { eventId: event.id, postId: second.id }, { method: "PATCH", body: { direction: "up" } });

    expect((await readFeed(event.id)).items.map((post) => post.text)).toEqual(["Segundo", "Primeiro", "Terceiro"]);

    expect((await callRoute(togglePin, { eventId: event.id, postId: second.id }, { method: "POST" })).body).toEqual({
      pinned: false,
      pinnedOrder: null,
    });
    expect(
      (
        await callRoute(
          movePin,
          { eventId: event.id, postId: second.id },
          { method: "PATCH", body: { direction: "up" } },
        )
      ).status,
    ).toBe(404);
  });

  it("numbers posts by creation order, whatever their place in the list", async () => {
    const { event, ana, admin } = await setupFeed();
    const first = await postAs(ana, event.id, { text: "Primeiro" });
    await postAs(ana, event.id, { text: "Segundo" });
    const third = await postAs(ana, event.id, { text: "Terceiro" });
    expect([first.postNumber, third.postNumber]).toEqual([1, 3]);

    signInAs(admin);
    await callRoute(togglePin, { eventId: event.id, postId: first.id }, { method: "POST" });
    const secondPage = await getFeedPosts(event.id, admin.id, 1, 2);

    // The pinned first post leads the list; page two still carries the numbers 3 and 2.
    expect(secondPage.items.map((post) => post.postNumber)).toEqual([3, 2]);
  });

  it("keeps every post's number when an older one is deleted", async () => {
    const { event, ana, admin } = await setupFeed();
    await postAs(ana, event.id, { text: "Primeiro" });
    const second = await postAs(ana, event.id, { text: "Segundo" });
    const third = await postAs(ana, event.id, { text: "Terceiro" });

    signInAs(admin);
    await callRoute(deletePost, { eventId: event.id, postId: second.id }, { method: "DELETE" });

    const posts = (await getFeedPosts(event.id, admin.id, 0, 10)).items;
    expect(posts.find((post) => post.id === third.id)?.postNumber).toBe(3);
    // A new post carries on after the highest number, not into the gap.
    expect((await postAs(ana, event.id, { text: "Quarto" })).postNumber).toBe(4);
  });

  it("lets an admin delete a post, and answers 404 for an unknown one", async () => {
    const { event, ana, admin } = await setupFeed();
    const post = await postAs(ana, event.id, { text: "Apaga-me" });

    signInAs(admin);
    expect((await callRoute(deletePost, { eventId: event.id, postId: post.id }, { method: "DELETE" })).status).toBe(
      204,
    );
    expect((await callRoute(deletePost, { eventId: event.id, postId: post.id }, { method: "DELETE" })).status).toBe(
      404,
    );
    expect(await prisma.hubPost.count()).toBe(0);
  });
});

describe("feed reactions", () => {
  it("toggles a like, and a downvote replaces it", async () => {
    const { event, ana, rui } = await setupFeed();
    const post = await postAs(ana, event.id, { text: "Gostas?" });
    const params = { eventId: event.id, postId: post.id };

    signInAs(rui);
    // A resposta traz o estado final, que o cliente usa para pintar o botão.
    expect(await callRoute(likePost, params, { method: "POST" })).toEqual({ status: 200, body: { liked: true } });
    expect((await readFeed(event.id)).items[0]).toMatchObject({ likeCount: 1, likedByMe: true, downvoteCount: 0 });

    expect(await callRoute(downvotePost, params, { method: "POST" })).toEqual({
      status: 200,
      body: { downvoted: true },
    });
    expect((await readFeed(event.id)).items[0]).toMatchObject({
      likeCount: 0,
      likedByMe: false,
      downvoteCount: 1,
      downvotedByMe: true,
    });

    await callRoute(likePost, params, { method: "POST" });
    expect((await readFeed(event.id)).items[0]).toMatchObject({ likeCount: 1, downvoteCount: 0 });

    expect(await callRoute(likePost, params, { method: "POST" })).toEqual({ status: 200, body: { liked: false } });
    expect((await readFeed(event.id)).items[0]).toMatchObject({ likeCount: 0, likedByMe: false });
  });

  it("counts emoji reactions per member and toggles them off", async () => {
    const { event, ana, rui } = await setupFeed();
    const post = await postAs(ana, event.id, { text: "Ri-te" });
    const params = { eventId: event.id, postId: post.id };

    await callRoute(reactToPost, params, { method: "POST", body: { emoji: "laugh" } });
    signInAs(rui);
    await callRoute(reactToPost, params, { method: "POST", body: { emoji: "laugh" } });
    expect((await readFeed(event.id)).items[0]).toMatchObject({ reactionCounts: { laugh: 2 }, myReactions: ["laugh"] });

    await callRoute(reactToPost, params, { method: "POST", body: { emoji: "laugh" } });
    expect((await readFeed(event.id)).items[0]).toMatchObject({ reactionCounts: { laugh: 1 }, myReactions: [] });
  });

  it("answers 404 for a post of another event", async () => {
    const { event, ana } = await setupFeed();
    const otherEvent = await createEvent();
    const post = await postAs(ana, event.id, { text: "Aqui" });
    await prisma.eventMember.create({
      data: { eventId: otherEvent.id, userId: ana.id, role: "participant", joinedAtUtc: new Date() },
    });

    const response = await callRoute(likePost, { eventId: otherEvent.id, postId: post.id }, { method: "POST" });
    expect(response.status).toBe(404);
  });
});

describe("feed comments", () => {
  async function setupPost() {
    const feed = await setupFeed();
    const post = await postAs(feed.ana, feed.event.id, { text: "Comenta" });
    return { ...feed, post, params: { eventId: feed.event.id, postId: post.id } };
  }

  const listComments = async (params: { eventId: string; postId: string }) =>
    (await callRoute(getComments, params)).body as HubCommentDto[];

  it("adds comments and replies in order, with reactions, and counts them on the post", async () => {
    const { event, rui, params } = await setupPost();

    signInAs(rui);
    const comment = (await callRoute(postComment, params, { method: "POST", body: { text: " Boa " } }))
      .body as HubCommentDto;
    const reply = await callRoute(postComment, params, {
      method: "POST",
      body: { text: "Resposta", replyToId: comment.id },
    });
    await callRoute(reactToComment, { ...params, commentId: comment.id }, { method: "POST", body: { emoji: "fire" } });

    expect(reply.status).toBe(201);
    expect(await listComments(params)).toMatchObject([
      { text: "Boa", userName: "Rui", reactionCounts: { fire: 1 }, myReactions: ["fire"] },
      { text: "Resposta", replyToId: comment.id },
    ]);
    expect((await readFeed(event.id)).items[0]?.commentCount).toBe(2);

    await callRoute(reactToComment, { ...params, commentId: comment.id }, { method: "POST", body: { emoji: "fire" } });
    expect((await listComments(params))[0]?.reactionCounts).toEqual({});
  });

  it("refuses a reply to a comment of another post", async () => {
    const { event, ana, rui, params } = await setupPost();
    const otherPost = await postAs(ana, event.id, { text: "Outro" });
    signInAs(rui);
    const comment = (await callRoute(postComment, params, { method: "POST", body: { text: "Aqui" } }))
      .body as HubCommentDto;

    const response = await callRoute(
      postComment,
      { eventId: event.id, postId: otherPost.id },
      { method: "POST", body: { text: "Ali", replyToId: comment.id } },
    );
    expect(response.status).toBe(404);
  });

  it("lets only the author or an admin delete a comment", async () => {
    const { ana, rui, admin, params } = await setupPost();
    signInAs(rui);
    const comment = (await callRoute(postComment, params, { method: "POST", body: { text: "Meu" } }))
      .body as HubCommentDto;
    const commentParams = { ...params, commentId: comment.id };

    signInAs(ana);
    expect((await callRoute(deleteComment, commentParams, { method: "DELETE" })).status).toBe(404);

    signInAs(admin);
    expect((await callRoute(deleteComment, commentParams, { method: "DELETE" })).status).toBe(204);
    expect(await prisma.hubPostComment.count()).toBe(0);
  });
});
