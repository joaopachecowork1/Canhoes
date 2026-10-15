import type { ProposalStatus } from "@/lib/api/types";

export type { ProposalStatus };
export type ProposalFilter = "all" | ProposalStatus;

export type ProposalCounts = Record<ProposalStatus, number> & { all: number };
export type ProposalType = "category" | "measure";

export type PendingProposalCard = {
  deleteIcon?: "trash";
  deleteLabel?: string;
  id: string;
  isBusy: boolean;
  meta: string;
  note?: string;
  onApprove?: () => void;
  onDelete: () => void;
  onReject?: () => void;
  onReopen?: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  saveLabel: string;
  status: ProposalStatus;
  title: string;
  fields: Array<{
    disabled?: boolean;
    icon: "description" | "measure" | "name";
    id: string;
    label: string;
    multiline?: boolean;
    onChange: (value: string) => void;
    placeholder?: string;
    value: string;
  }>;
};

export type PendingProposalPanel = {
  counts: ProposalCounts;
  description: string;
  emptyMessage: string;
  filter: ProposalFilter;
  items: PendingProposalCard[];
  setFilter: (filter: ProposalFilter) => void;
  subtitle: string;
  title: string;
  totalCount: number;
  type: ProposalType;
};

export type DeleteConfirmationRequest = {
  id: string;
  title: string;
  type: ProposalType;
  onConfirm: () => void;
};