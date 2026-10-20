import { describe, expect, it } from "vitest";

import { PUT as setMyColor } from "@/app/api/v1/me/color/route";
import {
  GET as getComments,
  POST as postComment,
} from "@/app/api/v1/events/[eventId]/feed/posts/[postId]/comments/route";
import { GET as getPosts, POST as createPost } from "@/app/api/v1/events/[eventId]/feed/posts/route";
import { GET as getMembers } from "@/app/api/v1/events/[eventId]/members/route";
import type { EventFeedPostFullDto, HubCommentDto, PagedResult, PublicUserDto } from "@/lib/api/types";
import { PERSON_COLORS } from "@/lib/personColors";
import { prisma } from "@/lib/prisma";

import { callRoute, createEvent, createMember, signInAs } from "./helpers";

describe("person colours", () => {
  it("gives every new user a colour from the palette", async () => {
    const event = await createEvent();
    const users = await Promise.all(Array.from({ length: 5 }, (_, index) => createMember(event.id, `Pessoa ${index}`)));

    for (const user of users) {
      const { color } = await prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { color: true } });
      expect(PERSON_COLORS).toContain(color);
    }
  });

  it("lets a member pick their own colour and refuses one outside the palette", async () => {
    const event = await createEvent();
    const ana = await createMember(event.id, "Ana");
    signInAs(ana);

    expect((await callRoute(setMyColor, {}, { method: "PUT", body: { color: "pink" } })).body).toEqual({
      color: "pink",
    });
    expect((await callRoute(setMyColor, {}, { method: "PUT", body: { color: "#ff0000" } })).status).toBe(400);
    expect(await prisma.user.findUniqueOrThrow({ where: { id: ana.id }, select: { color: true } })).toEqual({
      color: "pink",
    });
  });

  it("shows each person's colour on members, posts and comments", async () => {
    const event = await createEvent();
    const ana = await createMember(event.id, "Ana");
    await prisma.user.update({ where: { id: ana.id }, data: { color: "teal" } });
    signInAs(ana);

    const post = (await callRoute(createPost, { eventId: event.id }, { method: "POST", body: { text: "Olá" } }))
      .body as EventFeedPostFullDto;
    await callRoute(postComment, { eventId: event.id, postId: post.id }, { method: "POST", body: { text: "Eu" } });

    const members = (await callRoute(getMembers, { eventId: event.id })).body as PublicUserDto[];
    const feed = (await callRoute(getPosts, { eventId: event.id })).body as PagedResult<EventFeedPostFullDto>;
    const comments = (await callRoute(getComments, { eventId: event.id, postId: post.id })).body as HubCommentDto[];

    expect(members.find((member) => member.id === ana.id)?.color).toBe("teal");
    expect(post.authorColor).toBe("teal");
    expect(feed.items[0]?.authorColor).toBe("teal");
    expect(comments[0]?.userColor).toBe("teal");
  });
});
