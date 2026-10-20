import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { GET as getActiveContext } from "@/app/api/v1/events/active/context/route";
import { GET as getMeasures, POST as proposeMeasure } from "@/app/api/v1/events/[eventId]/measures/route";
import { GET as getMembers } from "@/app/api/v1/events/[eventId]/members/route";
import { PATCH as updateModules } from "@/app/api/v1/events/[eventId]/modules/route";
import { GET as getApproved } from "@/app/api/v1/events/[eventId]/nominations/approved/route";
import { GET as getMyStatus } from "@/app/api/v1/events/[eventId]/nominations/my-status/route";
import { POST as nominate } from "@/app/api/v1/events/[eventId]/nominations/route";
import { POST as uploadNomineeImage } from "@/app/api/v1/events/[eventId]/nominations/[nomineeId]/upload/route";
import { GET as getOverview } from "@/app/api/v1/events/[eventId]/overview/route";
import { POST as uploadFeedImages } from "@/app/api/v1/events/[eventId]/feed/uploads/route";
import { POST as uploadWishlistImage } from "@/app/api/v1/events/[eventId]/wishlist/[itemId]/image/route";
import { DELETE as deleteWishlistItem } from "@/app/api/v1/events/[eventId]/wishlist/[itemId]/route";
import { GET as getWishlist, POST as addWishlistItem } from "@/app/api/v1/events/[eventId]/wishlist/route";
import type { EventActiveContextDto, EventOverviewDto, EventWishlistItemDto, MyNominationDto, NomineeDto, PublicUserDto } from "@/lib/api/types";
import { prisma } from "@/lib/prisma";

import { addMember, callRoute, createEvent, createMember, createUser, signInAs, randomIp } from "./helpers";

let uploadsDir = "";
beforeAll(async () => {
  uploadsDir = await mkdtemp(path.join(os.tmpdir(), "canhoes-uploads-"));
  process.env.UPLOADS_DIR = uploadsDir;
});
afterAll(async () => {
  delete process.env.UPLOADS_DIR;
  await rm(uploadsDir, { recursive: true, force: true });
});

type UploadHandler<Params> = (request: NextRequest, context: { params: Promise<Params> }) => Promise<Response>;

/** Sends `files` as multipart form data under `field`, as the browser does for uploads. */
async function callUpload<Params>(handler: UploadHandler<Params>, params: Params, files: File[], field = "file") {
  const form = new FormData();
  files.forEach((file) => form.append(field, file));
  const response = await handler(new NextRequest("http://localhost/api/test", { method: "POST", body: form, headers: { "x-forwarded-for": randomIp() } }), { params: Promise.resolve(params) });
  const text = await response.text();
  return { status: response.status, body: text ? (JSON.parse(text) as unknown) : null };
}

const image = (name = "foto.png") => new File([new Uint8Array([137, 80, 78, 71])], name, { type: "image/png" });

describe("members and measures", () => {
  it("lists the members with event admins first", async () => {
    const event = await createEvent();
    const boss = await createUser({ name: "Zé" });
    await addMember(event.id, boss.id, "admin");
    const ana = await createMember(event.id, "Ana");
    await createMember(event.id, "Bruno");

    signInAs(ana);
    const members = (await callRoute(getMembers, { eventId: event.id })).body as PublicUserDto[];
    expect(members.map((member) => [member.displayName, member.isAdmin])).toEqual([["Zé", true], ["Ana", false], ["Bruno", false]]);
  });

  it("records a measure proposal as pending and lists only official measures", async () => {
    const event = await createEvent({ phase: "PROPOSALS" });
    const ana = await createMember(event.id, "Ana");
    await prisma.galaMeasure.create({ data: { eventId: event.id, text: "Ninguém sai cedo", isActive: true } });

    signInAs(ana);
    const proposal = await callRoute(proposeMeasure, { eventId: event.id }, { method: "POST", body: { text: "Quem perder paga" } });
    expect(proposal.body).toMatchObject({ text: "Quem perder paga", status: "pending" });
    expect(((await callRoute(getMeasures, { eventId: event.id })).body as { text: string }[]).map((measure) => measure.text)).toEqual(["Ninguém sai cedo"]);
  });
});

describe("nominations", () => {
  it("records a pending nomination, reports it as mine and hides it until approved", async () => {
    const event = await createEvent({ phase: "PROPOSALS" });
    const ana = await createMember(event.id, "Ana");
    const category = await prisma.awardCategory.create({ data: { eventId: event.id, name: "Momento", sortOrder: 1, kind: 0, isActive: true } });
    signInAs(ana);

    expect((await callRoute(getMyStatus, { eventId: event.id })).body).toEqual([]);

    const created = (await callRoute(nominate, { eventId: event.id }, { method: "POST", body: { categoryId: category.id, title: " O jantar " } })).body as NomineeDto;
    expect(created).toMatchObject({ title: "O jantar", status: "pending", categoryId: category.id });
    expect((await callRoute(getMyStatus, { eventId: event.id })).body).toEqual([
      { categoryId: category.id, status: "pending", nomineeId: created.id, nomineeTitle: "O jantar" },
    ]);
    expect((await callRoute(getApproved, { eventId: event.id })).body).toEqual([]);

    await prisma.nominee.update({ where: { id: created.id }, data: { status: "approved" } });
    expect(((await callRoute(getApproved, { eventId: event.id })).body as NomineeDto[]).map((nominee) => nominee.id)).toEqual([created.id]);
  });

  it("reports one nomination per category, newest first, and leaves stickers out", async () => {
    const event = await createEvent({ phase: "PROPOSALS" });
    signInAs(await createMember(event.id, "Ana"));
    const [moment, photo] = await Promise.all(
      ["Momento", "Foto"].map((name, index) => prisma.awardCategory.create({ data: { eventId: event.id, name, sortOrder: index, kind: 0, isActive: true } }))
    );

    await callRoute(nominate, { eventId: event.id }, { method: "POST", body: { categoryId: moment.id, title: "O jantar" } });
    await callRoute(nominate, { eventId: event.id }, { method: "POST", body: { categoryId: photo.id, title: "A praia" } });
    await callRoute(nominate, { eventId: event.id }, { method: "POST", body: { title: "Sticker", kind: "stickers" } });

    const mine = (await callRoute(getMyStatus, { eventId: event.id })).body as MyNominationDto[];
    const byTitle = [...mine].sort((left, right) => left.nomineeTitle.localeCompare(right.nomineeTitle));
    expect(byTitle.map(({ categoryId, nomineeTitle, status }) => [categoryId, nomineeTitle, status])).toEqual([
      [photo.id, "A praia", "pending"],
      [moment.id, "O jantar", "pending"],
    ]);
  });

  it("stores stickers apart from nominations", async () => {
    const event = await createEvent({ phase: "PROPOSALS" });
    signInAs(await createMember(event.id));

    await callRoute(nominate, { eventId: event.id }, { method: "POST", body: { title: "Sticker", kind: " Stickers " } });
    expect(await prisma.nominee.findFirst({ select: { submissionKind: true } })).toEqual({ submissionKind: "stickers" });
  });

  it("replaces the image of your own nomination only", async () => {
    const event = await createEvent({ phase: "PROPOSALS" });
    const ana = await createMember(event.id, "Ana");
    const rui = await createMember(event.id, "Rui");
    signInAs(ana);
    const created = (await callRoute(nominate, { eventId: event.id }, { method: "POST", body: { title: "Foto" } })).body as NomineeDto;
    const params = { eventId: event.id, nomineeId: created.id };

    const first = (await callUpload(uploadNomineeImage, params, [image()])).body as NomineeDto;
    const second = (await callUpload(uploadNomineeImage, params, [image()])).body as NomineeDto;
    expect(second.imageUrl).toMatch(/^\/uploads\/canhoes\/nominees\/.+\.png$/);
    expect(second.imageUrl).not.toBe(first.imageUrl);
    expect(await readdir(path.join(uploadsDir, "canhoes", "nominees"))).toHaveLength(1);

    signInAs(rui);
    expect((await callUpload(uploadNomineeImage, params, [image()])).status).toBe(404);
    expect((await callUpload(uploadNomineeImage, params, [])).status).toBe(400);
  });
});

describe("wishlist", () => {
  it("adds, lists, illustrates and deletes your own items", async () => {
    const event = await createEvent();
    const ana = await createMember(event.id, "Ana");
    const rui = await createMember(event.id, "Rui");
    const params = { eventId: event.id };

    signInAs(ana);
    const item = (await callRoute(addWishlistItem, params, { method: "POST", body: { title: " Livro ", url: " https://loja.pt ", notes: null } })).body as EventWishlistItemDto;
    expect(item).toMatchObject({ title: "Livro", url: "https://loja.pt", userId: ana.id });
    expect((await callRoute(getWishlist, params)).body).toMatchObject({ total: 1, items: [{ id: item.id }] });

    const withImage = (await callUpload(uploadWishlistImage, { ...params, itemId: item.id }, [image()])).body as EventWishlistItemDto;
    expect(withImage.imageUrl).toMatch(/^\/uploads\/canhoes\/wishlist\//);

    signInAs(rui);
    expect((await callRoute(deleteWishlistItem, { ...params, itemId: item.id }, { method: "DELETE" })).status).toBe(404);
    expect((await callUpload(uploadWishlistImage, { ...params, itemId: item.id }, [image()])).status).toBe(404);

    signInAs(ana);
    expect((await callRoute(deleteWishlistItem, { ...params, itemId: item.id }, { method: "DELETE" })).status).toBe(204);
  });
});

describe("feed uploads", () => {
  it("stores up to four images and refuses other files", async () => {
    const event = await createEvent();
    signInAs(await createMember(event.id));
    const params = { eventId: event.id };

    const stored = await callUpload(uploadFeedImages, params, [image("a.png"), image("b.png")], "files");
    expect(stored.body).toMatchObject({ files: [{ fileName: "a.png" }, { fileName: "b.png" }] });
    expect(await prisma.hubPostMedia.count()).toBe(2);

    expect((await callUpload(uploadFeedImages, params, [], "files")).status).toBe(400);
    expect((await callUpload(uploadFeedImages, params, Array.from({ length: 5 }, () => image()), "files")).status).toBe(400);
    expect((await callUpload(uploadFeedImages, params, [new File(["x"], "a.txt", { type: "text/plain" })], "files")).status).toBe(400);
  });
});

describe("event overview", () => {
  it("gives the active event's context with the areas open in its phase", async () => {
    const event = await createEvent({ phase: "VOTING" });
    signInAs(await createMember(event.id));

    const context = (await callRoute(getActiveContext, {})).body as EventActiveContextDto;
    expect(context.event.id).toBe(event.id);
    expect(context.overview).toMatchObject({ activePhase: { type: "VOTING" }, permissions: { canVote: true, canSubmitProposal: false } });
    expect(context.overview.modules.voting).toBe(true);
  });

  it("answers 404 when there is no active event", async () => {
    signInAs(await createUser());
    expect((await callRoute(getActiveContext, {})).status).toBe(404);
  });

  it("lets an admin switch areas off and returns the new overview", async () => {
    const event = await createEvent({ phase: "PROPOSALS" });
    signInAs(await createUser({ isAdmin: true }));

    const overview = (await callRoute(updateModules, { eventId: event.id }, { method: "PATCH", body: { modules: { stickers: false } } })).body as EventOverviewDto;
    expect(overview.modules.stickers).toBe(false);
    expect(((await callRoute(getOverview, { eventId: event.id })).body as EventOverviewDto).modules.stickers).toBe(false);
    expect((await callRoute(updateModules, { eventId: event.id }, { method: "PATCH", body: { modules: {} } })).status).toBe(400);
  });
});
