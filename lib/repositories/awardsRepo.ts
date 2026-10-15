import { canhoesFetch } from "@/lib/api/canhoesClient";
import type * as T from "@/lib/api/types";

export const awardsRepo = {
  getCategories: (eventId: string, skip = 0, take = 50) =>
    canhoesFetch<T.PagedResult<T.AwardCategoryDto>>(`/v1/events/${eventId}/categories?skip=${skip}&take=${take}`),
    
  getApprovedNominees: (eventId: string) =>
    canhoesFetch<T.NomineeDto[]>(`/v1/events/${eventId}/nominations/approved`),
    
  getMyNominationStatus: (eventId: string) =>
    canhoesFetch<T.MyNominationStatusDto>(`/v1/events/${eventId}/nominations/my-status`),
    
  createNomination: (eventId: string, payload: { categoryId: string | null; title: string; kind?: string }) =>
    canhoesFetch<T.NomineeDto>(`/v1/events/${eventId}/nominations`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    
  uploadNomineeImage: (eventId: string, nomineeId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return canhoesFetch<void>(`/v1/events/${eventId}/nominations/${nomineeId}/upload`, {
      method: "POST",
      body: formData,
      canhoes: { skipDeduplication: true },
    });
  },
  
  getVotingBoard: (eventId: string) =>
    canhoesFetch<T.EventVotingBoardDto>(`/v1/events/${eventId}/voting`),
    
  castOfficialVote: (eventId: string, payload: T.CastOfficialVoteRequest) =>
    canhoesFetch<void>(`/v1/events/${eventId}/votes`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    
  getResults: (eventId: string) =>
    canhoesFetch<T.PublicCategoryResultDto[]>(`/v1/events/${eventId}/results`),
    
  createCategoryProposal: (eventId: string, payload: { name: string; description: string | null; kind?: number }) =>
    canhoesFetch<T.CategoryProposalDto>(`/v1/events/${eventId}/proposals`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    
  getMeasures: (eventId: string) =>
    canhoesFetch<T.GalaMeasureDto[]>(`/v1/events/${eventId}/measures`),
    
  createMeasureProposal: (eventId: string, payload: { text: string }) =>
    canhoesFetch<T.MeasureProposalDto>(`/v1/events/${eventId}/measures`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
