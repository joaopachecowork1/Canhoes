import { z } from "zod";

/** Estados possíveis de uma proposta, partilhados pelas várias validações. */
export const ProposalStatusSchema = z.enum(["pending", "approved", "rejected"]);
