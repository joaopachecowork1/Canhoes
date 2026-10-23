import { canhoesFetch } from "@/lib/api/canhoesClient";
import type * as T from "@/lib/api/types";

/** Chamadas da administração à API do evento (fase, categorias, propostas, nomeações, votos, amigo secreto). */
export const adminRepo = {
  getBootstrap: (eventId: string) => canhoesFetch<T.EventAdminBootstrapDto>(`/v1/events/${eventId}/admin/bootstrap`),

  inviteUser: (payload: { email: string; eventId?: string | null; role?: "participant" | "admin" }) =>
    canhoesFetch<{ inviteUrl: string; role?: string; isAdmin?: boolean; emailSent?: boolean }>("/admin/invites", {
      method: "POST",
      body: JSON.stringify(payload),
      canhoes: { throwOnUnauthorized: true },
    }),

  getInvitations: (eventId?: string | null) =>
    canhoesFetch<T.UserInvitationDto[]>(
      eventId ? `/admin/invites?eventId=${encodeURIComponent(eventId)}` : "/admin/invites",
      { canhoes: { throwOnUnauthorized: true } },
    ),

  resendInvitation: (inviteId: string) =>
    canhoesFetch<{ emailSent: boolean }>(`/admin/invites/${inviteId}`, {
      method: "POST",
      canhoes: { throwOnUnauthorized: true },
    }),

  revokeInvitation: (inviteId: string) =>
    canhoesFetch<{ success: boolean }>(`/admin/invites/${inviteId}`, {
      method: "DELETE",
      canhoes: { throwOnUnauthorized: true },
    }),

  updatePhase: (eventId: string, payload: { phaseType: string }) =>
    canhoesFetch(`/v1/events/${eventId}/admin/phase`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  activateEvent: (eventId: string) => canhoesFetch(`/v1/events/${eventId}/admin/activate`, { method: "PUT" }),

  updateAdminState: (eventId: string, payload: unknown) =>
    canhoesFetch(`/v1/events/${eventId}/admin/state`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  updateModules: (eventId: string, payload: Record<string, boolean>) =>
    canhoesFetch(`/v1/events/${eventId}/modules`, {
      method: "PATCH",
      body: JSON.stringify({ modules: payload }),
      canhoes: { throwOnUnauthorized: true },
    }),

  getMembersPaged: (eventId: string, skip = 0, take = 50) =>
    canhoesFetch<T.PagedResult<T.PublicUserDto>>(`/v1/events/${eventId}/admin/members/paged?skip=${skip}&take=${take}`),

  setMemberAdmin: (eventId: string, userId: string, payload: { isAdmin: boolean; confirmSelfDemotion?: boolean }) =>
    canhoesFetch<{ user: { id: string; isAdmin: boolean } }>(`/v1/events/${eventId}/admin/members/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify(payload),
      canhoes: { throwOnUnauthorized: true },
    }),

  getNominationsPaged: (eventId: string, skip = 0, take = 50, status?: string) =>
    canhoesFetch<T.AdminNomineesPagedDto>(
      `/v1/events/${eventId}/admin/nominations/paged?${new URLSearchParams({ skip: String(skip), take: String(take), ...(status ? { status } : {}) })}`,
    ),

  approveNomination: (eventId: string, nomineeId: string) =>
    canhoesFetch(`/v1/events/${eventId}/admin/nominations/${nomineeId}/approve`, { method: "POST" }),

  rejectNomination: (eventId: string, nomineeId: string) =>
    canhoesFetch(`/v1/events/${eventId}/admin/nominations/${nomineeId}/reject`, { method: "POST" }),

  setNominationCategory: (eventId: string, nomineeId: string, payload: { categoryId: string | null }) =>
    canhoesFetch(`/v1/events/${eventId}/admin/nominations/${nomineeId}/set-category`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getCategories: (eventId: string) => canhoesFetch<T.AwardCategoryDto[]>(`/v1/events/${eventId}/admin/categories`),

  createCategory: (eventId: string, payload: T.CreateAwardCategoryRequest) =>
    canhoesFetch<T.AwardCategoryDto>(`/v1/events/${eventId}/admin/categories`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateCategory: (eventId: string, categoryId: string, payload: T.UpdateAwardCategoryRequest) =>
    canhoesFetch<T.AwardCategoryDto>(`/v1/events/${eventId}/admin/categories/${categoryId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteCategory: (eventId: string, categoryId: string) =>
    canhoesFetch<void>(`/v1/events/${eventId}/admin/categories/${categoryId}`, { method: "DELETE" }),

  getCategoryProposals: (eventId: string, status = "pending", skip = 0, take = 50) =>
    canhoesFetch<T.PagedResult<T.CategoryProposalDto>>(
      `/v1/events/${eventId}/admin/category-proposals?status=${encodeURIComponent(status)}&skip=${skip}&take=${take}`,
    ),

  updateCategoryProposal: (
    eventId: string,
    proposalId: string,
    payload: { name: string; description: string | null; status?: string },
  ) =>
    canhoesFetch<T.CategoryProposalDto>(`/v1/events/${eventId}/admin/category-proposals/${proposalId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteCategoryProposal: (eventId: string, proposalId: string) =>
    canhoesFetch<void>(`/v1/events/${eventId}/admin/category-proposals/${proposalId}`, { method: "DELETE" }),

  getMeasureProposals: (eventId: string, status = "pending", skip = 0, take = 50) =>
    canhoesFetch<T.PagedResult<T.MeasureProposalDto>>(
      `/v1/events/${eventId}/admin/measure-proposals?status=${encodeURIComponent(status)}&skip=${skip}&take=${take}`,
    ),

  updateMeasureProposal: (eventId: string, proposalId: string, payload: { text?: string; status?: string }) =>
    canhoesFetch<T.MeasureProposalDto>(`/v1/events/${eventId}/admin/measure-proposals/${proposalId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteMeasureProposal: (eventId: string, proposalId: string) =>
    canhoesFetch<void>(`/v1/events/${eventId}/admin/measure-proposals/${proposalId}`, { method: "DELETE" }),

  getVotesPaged: (eventId: string, skip = 0, take = 50) =>
    canhoesFetch<T.AdminVotesPagedDto>(`/v1/events/${eventId}/admin/votes/paged?skip=${skip}&take=${take}`),

  getOfficialResultsPaged: (eventId: string, skip = 0, take = 50) =>
    canhoesFetch<T.PagedResult<T.AdminCategoryResultDto>>(
      `/v1/events/${eventId}/admin/official-results/paged?skip=${skip}&take=${take}`,
    ),

  getSecretSantaState: (eventId: string) =>
    canhoesFetch<T.EventAdminSecretSantaStateDto>(`/v1/events/${eventId}/admin/secret-santa/state`),

  drawSecretSanta: (eventId: string, payload?: unknown) =>
    canhoesFetch(`/v1/events/${eventId}/admin/secret-santa/draw`, {
      method: "POST",
      body: JSON.stringify(payload ?? {}),
    }),

  resetSecretSanta: (eventId: string) =>
    canhoesFetch<T.EventAdminSecretSantaStateDto>(`/v1/events/${eventId}/admin/secret-santa/reset`, {
      method: "POST",
    }),

  revealSecretSanta: (eventId: string) =>
    canhoesFetch<T.EventAdminSecretSantaStateDto>(`/v1/events/${eventId}/admin/secret-santa/reveal`, {
      method: "POST",
    }),
};
