import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

import { addMember, createEvent, createUser } from "./helpers";

/** A base de dados recusa ids de utilizadores que não existem e apaga a participação de quem sai. */
describe("user integrity", () => {
  it("refuses a member that points at no user", async () => {
    const event = await createEvent();

    await expect(
      prisma.eventMember.create({
        data: { eventId: event.id, userId: "00000000-0000-0000-0000-000000000000", joinedAtUtc: new Date() },
      }),
    ).rejects.toThrow();
  });

  it("deletes the participation of a deleted user", async () => {
    const event = await createEvent();
    const user = await createUser();
    await addMember(event.id, user.id);

    await prisma.user.delete({ where: { id: user.id } });

    expect(await prisma.eventMember.count({ where: { userId: user.id } })).toBe(0);
  });

  it("refuses to delete a user who wrote a post", async () => {
    const event = await createEvent();
    const author = await createUser();
    await prisma.hubPost.create({ data: { eventId: event.id, authorUserId: author.id, text: "Olá", isPinned: false } });

    await expect(prisma.user.delete({ where: { id: author.id } })).rejects.toThrow();
    expect(await prisma.user.count({ where: { id: author.id } })).toBe(1);
  });

  it("keeps the votes someone received: a voted person cannot be deleted, a voter takes only their own ballot", async () => {
    const event = await createEvent();
    const voter = await createUser();
    const target = await createUser();
    await prisma.vote.create({
      data: { eventId: event.id, categoryId: "cat", userId: voter.id, targetUserId: target.id },
    });

    await expect(prisma.user.delete({ where: { id: target.id } })).rejects.toThrow();

    await prisma.user.delete({ where: { id: voter.id } });
    expect(await prisma.vote.count({ where: { userId: voter.id } })).toBe(0);
  });
});
