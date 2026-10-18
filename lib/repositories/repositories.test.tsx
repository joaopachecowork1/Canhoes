import { beforeEach, describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";

import { server } from "@/tests/component/server";

import { adminRepo } from "./adminRepo";
import { authRepo } from "./authRepo";
import { awardsRepo } from "./awardsRepo";
import { eventRepo } from "./eventRepo";
import { feedRepo } from "./feedRepo";

/*
 * Contract tests: every repository function must call the route handler the API defines
 * (method, path with query and JSON body). One row per function; the fake API records the call.
 */

type Call = { method: string; path: string; body: unknown };
let calls: Call[] = [];

beforeEach(() => {
  calls = [];
  server.use(
    http.all("*/api/*", async ({ request }) => {
      const url = new URL(request.url);
      const isJson = request.headers.get("content-type")?.includes("application/json");
      const text = isJson ? await request.text() : "";
      calls.push({ method: request.method, path: url.pathname.replace(/^\/api/, "") + url.search, body: text ? JSON.parse(text) : null });
      return HttpResponse.json({ files: [{ url: "/uploads/a.jpg" }] });
    })
  );
});

const image = new File(["x"], "a.png", { type: "image/png" });

const cases: [string, () => Promise<unknown>, string, string, unknown?][] = [
  ["eventRepo.getActiveContext", () => eventRepo.getActiveContext(), "GET", "/v1/events/active/context"],
  ["eventRepo.getEventOverview", () => eventRepo.getEventOverview("e1"), "GET", "/v1/events/e1/overview"],
  ["eventRepo.getMembers", () => eventRepo.getMembers("e1"), "GET", "/v1/events/e1/members"],
  ["eventRepo.getWishlist", () => eventRepo.getWishlist("e1", 20, 10), "GET", "/v1/events/e1/wishlist?skip=20&take=10"],
  ["eventRepo.createWishlistItem", () => eventRepo.createWishlistItem("e1", { title: "Livro", url: null, notes: null }), "POST", "/v1/events/e1/wishlist", { title: "Livro", url: null, notes: null }],
  ["eventRepo.uploadWishlistImage", () => eventRepo.uploadWishlistImage("e1", "w1", image), "POST", "/v1/events/e1/wishlist/w1/image"],
  ["eventRepo.deleteWishlistItem", () => eventRepo.deleteWishlistItem("e1", "w1"), "DELETE", "/v1/events/e1/wishlist/w1"],
  ["eventRepo.getSecretSantaOverview", () => eventRepo.getSecretSantaOverview("e1"), "GET", "/v1/events/e1/secret-santa/overview"],

  ["awardsRepo.getCategories", () => awardsRepo.getCategories("e1"), "GET", "/v1/events/e1/categories?skip=0&take=50"],
  ["awardsRepo.getApprovedNominees", () => awardsRepo.getApprovedNominees("e1"), "GET", "/v1/events/e1/nominations/approved"],
  ["awardsRepo.getMyNominationStatus", () => awardsRepo.getMyNominationStatus("e1"), "GET", "/v1/events/e1/nominations/my-status"],
  ["awardsRepo.createNomination", () => awardsRepo.createNomination("e1", { categoryId: "c1", title: "Ana" }), "POST", "/v1/events/e1/nominations", { categoryId: "c1", title: "Ana" }],
  ["awardsRepo.uploadNomineeImage", () => awardsRepo.uploadNomineeImage("e1", "n1", image), "POST", "/v1/events/e1/nominations/n1/upload"],
  ["awardsRepo.getVotingBoard", () => awardsRepo.getVotingBoard("e1"), "GET", "/v1/events/e1/voting"],
  ["awardsRepo.castOfficialVote", () => awardsRepo.castOfficialVote("e1", { categoryId: "c1", selectionId: "n1" }), "POST", "/v1/events/e1/votes", { categoryId: "c1", selectionId: "n1" }],
  ["awardsRepo.getResults", () => awardsRepo.getResults("e1"), "GET", "/v1/events/e1/results"],
  ["awardsRepo.createCategoryProposal", () => awardsRepo.createCategoryProposal("e1", { name: "Canhão", description: null, kind: 0 }), "POST", "/v1/events/e1/proposals", { name: "Canhão", description: null, kind: 0 }],
  ["awardsRepo.getMeasures", () => awardsRepo.getMeasures("e1"), "GET", "/v1/events/e1/measures"],
  ["awardsRepo.createMeasureProposal", () => awardsRepo.createMeasureProposal("e1", { text: "Rodada" }), "POST", "/v1/events/e1/measures", { text: "Rodada" }],

  ["feedRepo.getPosts", () => feedRepo.getPosts("e1", { skip: 10, take: 5 }), "GET", "/v1/events/e1/feed/posts?skip=10&take=5"],
  ["feedRepo.createPost", () => feedRepo.createPost("e1", { text: "Olá" }), "POST", "/v1/events/e1/feed/posts", { text: "Olá" }],
  ["feedRepo.getComments", () => feedRepo.getComments("e1", "p1"), "GET", "/v1/events/e1/feed/posts/p1/comments"],
  ["feedRepo.createComment", () => feedRepo.createComment("e1", "p1", { text: "Boa", replyToId: null }), "POST", "/v1/events/e1/feed/posts/p1/comments", { text: "Boa", replyToId: null }],
  ["feedRepo.deleteComment", () => feedRepo.deleteComment("e1", "p1", "c1"), "DELETE", "/v1/events/e1/feed/posts/p1/comments/c1"],
  ["feedRepo.togglePostLike", () => feedRepo.togglePostLike("e1", "p1"), "POST", "/v1/events/e1/feed/posts/p1/like"],
  ["feedRepo.togglePostDownvote", () => feedRepo.togglePostDownvote("e1", "p1"), "POST", "/v1/events/e1/feed/posts/p1/downvote"],
  ["feedRepo.togglePostReaction", () => feedRepo.togglePostReaction("e1", "p1", "🔥"), "POST", "/v1/events/e1/feed/posts/p1/reactions", { emoji: "🔥" }],
  ["feedRepo.toggleCommentReaction", () => feedRepo.toggleCommentReaction("e1", "p1", "c1", "😂"), "POST", "/v1/events/e1/feed/posts/p1/comments/c1/reactions", { emoji: "😂" }],
  ["feedRepo.votePoll", () => feedRepo.votePoll("e1", "p1", "o1"), "POST", "/v1/events/e1/feed/posts/p1/poll/vote", { optionId: "o1" }],
  ["feedRepo.uploadFeedImages", () => feedRepo.uploadFeedImages("e1", [image]), "POST", "/v1/events/e1/feed/uploads"],
  ["feedRepo.adminPinPost", () => feedRepo.adminPinPost("e1", "p1"), "POST", "/v1/events/e1/feed/posts/p1/pin"],
  ["feedRepo.adminMovePinnedPost", () => feedRepo.adminMovePinnedPost("e1", "p1", "up"), "PATCH", "/v1/events/e1/feed/posts/p1/pin", { direction: "up" }],
  ["feedRepo.adminDeletePost", () => feedRepo.adminDeletePost("e1", "p1"), "DELETE", "/v1/events/e1/feed/posts/p1"],

  ["authRepo.registerWithInvite", () => authRepo.registerWithInvite({ token: "t", password: "segredo123", displayName: "Ana" }), "POST", "/auth/register", { token: "t", password: "segredo123", displayName: "Ana" }],

  ["adminRepo.getBootstrap", () => adminRepo.getBootstrap("e1"), "GET", "/v1/events/e1/admin/bootstrap"],
  ["adminRepo.inviteUser", () => adminRepo.inviteUser({ email: "ana@canhoes.pt", eventId: "e1" }), "POST", "/admin/invites", { email: "ana@canhoes.pt", eventId: "e1" }],
  ["adminRepo.updatePhase", () => adminRepo.updatePhase("e1", { phaseType: "VOTING" }), "PUT", "/v1/events/e1/admin/phase", { phaseType: "VOTING" }],
  ["adminRepo.activateEvent", () => adminRepo.activateEvent("e1"), "PUT", "/v1/events/e1/admin/activate"],
  ["adminRepo.updateAdminState", () => adminRepo.updateAdminState("e1", { nominationsVisible: true }), "PUT", "/v1/events/e1/admin/state", { nominationsVisible: true }],
  ["adminRepo.updateModules", () => adminRepo.updateModules("e1", { gala: false }), "PATCH", "/v1/events/e1/modules", { modules: { gala: false } }],
  ["adminRepo.getMembersPaged", () => adminRepo.getMembersPaged("e1"), "GET", "/v1/events/e1/admin/members/paged?skip=0&take=50"],
  ["adminRepo.setMemberAdmin", () => adminRepo.setMemberAdmin("e1", "u1", { isAdmin: true }), "PATCH", "/v1/events/e1/admin/members/u1/role", { isAdmin: true }],
  ["adminRepo.getNominationsPaged (all)", () => adminRepo.getNominationsPaged("e1"), "GET", "/v1/events/e1/admin/nominations/paged?skip=0&take=50"],
  ["adminRepo.getNominationsPaged (pending)", () => adminRepo.getNominationsPaged("e1", 0, 1, "pending"), "GET", "/v1/events/e1/admin/nominations/paged?skip=0&take=1&status=pending"],
  ["adminRepo.approveNomination", () => adminRepo.approveNomination("e1", "n1"), "POST", "/v1/events/e1/admin/nominations/n1/approve"],
  ["adminRepo.rejectNomination", () => adminRepo.rejectNomination("e1", "n1"), "POST", "/v1/events/e1/admin/nominations/n1/reject"],
  ["adminRepo.setNominationCategory", () => adminRepo.setNominationCategory("e1", "n1", { categoryId: null }), "POST", "/v1/events/e1/admin/nominations/n1/set-category", { categoryId: null }],
  ["adminRepo.getCategories", () => adminRepo.getCategories("e1"), "GET", "/v1/events/e1/admin/categories"],
  ["adminRepo.createCategory", () => adminRepo.createCategory("e1", { name: "A", sortOrder: 1, kind: 0, description: null, voteQuestion: null, voteRules: null }), "POST", "/v1/events/e1/admin/categories", { name: "A", sortOrder: 1, kind: 0, description: null, voteQuestion: null, voteRules: null }],
  ["adminRepo.updateCategory", () => adminRepo.updateCategory("e1", "c1", { name: "A", sortOrder: 1, kind: 0, description: null, voteQuestion: null, voteRules: null, isActive: false }), "PUT", "/v1/events/e1/admin/categories/c1", { name: "A", sortOrder: 1, kind: 0, description: null, voteQuestion: null, voteRules: null, isActive: false }],
  ["adminRepo.deleteCategory", () => adminRepo.deleteCategory("e1", "c1"), "DELETE", "/v1/events/e1/admin/categories/c1"],
  ["adminRepo.getCategoryProposals", () => adminRepo.getCategoryProposals("e1"), "GET", "/v1/events/e1/admin/category-proposals?status=pending&skip=0&take=50"],
  ["adminRepo.updateCategoryProposal", () => adminRepo.updateCategoryProposal("e1", "p1", { name: "A", description: null, status: "approved" }), "PUT", "/v1/events/e1/admin/category-proposals/p1", { name: "A", description: null, status: "approved" }],
  ["adminRepo.deleteCategoryProposal", () => adminRepo.deleteCategoryProposal("e1", "p1"), "DELETE", "/v1/events/e1/admin/category-proposals/p1"],
  ["adminRepo.getMeasureProposals", () => adminRepo.getMeasureProposals("e1", "approved"), "GET", "/v1/events/e1/admin/measure-proposals?status=approved&skip=0&take=50"],
  ["adminRepo.updateMeasureProposal", () => adminRepo.updateMeasureProposal("e1", "m1", { status: "rejected" }), "PUT", "/v1/events/e1/admin/measure-proposals/m1", { status: "rejected" }],
  ["adminRepo.deleteMeasureProposal", () => adminRepo.deleteMeasureProposal("e1", "m1"), "DELETE", "/v1/events/e1/admin/measure-proposals/m1"],
  ["adminRepo.getVotesPaged", () => adminRepo.getVotesPaged("e1", 0, 1000), "GET", "/v1/events/e1/admin/votes/paged?skip=0&take=1000"],
  ["adminRepo.getOfficialResultsPaged", () => adminRepo.getOfficialResultsPaged("e1"), "GET", "/v1/events/e1/admin/official-results/paged?skip=0&take=50"],
  ["adminRepo.getSecretSantaState", () => adminRepo.getSecretSantaState("e1"), "GET", "/v1/events/e1/admin/secret-santa/state"],
  ["adminRepo.drawSecretSanta", () => adminRepo.drawSecretSanta("e1"), "POST", "/v1/events/e1/admin/secret-santa/draw", {}],
  ["adminRepo.revealSecretSanta", () => adminRepo.revealSecretSanta("e1"), "POST", "/v1/events/e1/admin/secret-santa/reveal"],
];

describe("repositories call the API they promise", () => {
  it.each(cases)("%s", async (_name, call, method, path, body = null) => {
    await call();
    expect(calls).toEqual([{ method, path, body }]);
  });

  it("returns the uploaded image URLs", async () => {
    await expect(feedRepo.uploadFeedImages("e1", [image])).resolves.toEqual(["/uploads/a.jpg"]);
  });
});
