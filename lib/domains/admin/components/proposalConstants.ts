/**
 * Shared constants and labels for proposal status filters.
 * Used across admin components for consistent filter UI.
 */

export const PROPOSAL_STATUS_LABELS = {
  all: "Todas",
  approved: "Aprovadas",
  pending: "Pendentes",
  rejected: "Rejeitadas",
} as const;

export const PROPOSAL_STATUS_OPTIONS = ["all", "pending", "approved", "rejected"] as const;
