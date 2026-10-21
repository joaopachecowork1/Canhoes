import { z } from "zod";

/** Estados possíveis de uma proposta, partilhados pelas várias validações. */
export const ProposalStatusSchema = z.preprocess(
  (val) => (typeof val === "string" ? val.toLowerCase() : val),
  z.enum(["pending", "approved", "rejected"]),
);
