import { describe, expect, it } from "vitest";

import type { AwardCategoryDto } from "@/lib/api/types";
import {
  CATEGORY_KIND,
  buildCategoryForm,
  buildCategoryUsage,
  buildCreateCategoryPayload,
  buildInitialCategoryForm,
} from "./categoryTypes";

const category: AwardCategoryDto = {
  id: "category-1",
  name: "Categoria",
  sortOrder: 3,
  isActive: true,
  kind: CATEGORY_KIND.USER_VOTE,
  description: "Descrição",
  voteQuestion: "Quem?",
  voteRules: "Uma escolha",
};

describe("category types", () => {
  it("builds a create payload with normalized optional fields", () => {
    const form = {
      ...buildInitialCategoryForm(1),
      name: "  Categoria nova  ",
      description: "  Descrição  ",
      sortOrder: "4",
      kind: "UserVote",
      voteQuestion: "  Quem?  ",
      voteRules: "  Uma escolha  ",
    };

    expect(buildCreateCategoryPayload(form)).toEqual({
      name: "Categoria nova",
      sortOrder: 4,
      kind: CATEGORY_KIND.USER_VOTE,
      description: "Descrição",
      voteQuestion: "Quem?",
      voteRules: "Uma escolha",
    });
  });

  it("drops vote-only fields when the category uses nominations", () => {
    const form = {
      ...buildInitialCategoryForm(1),
      name: "Categoria",
      voteQuestion: "Ignorada",
      voteRules: "Ignoradas",
    };

    expect(buildCreateCategoryPayload(form)).toMatchObject({
      kind: CATEGORY_KIND.STICKER,
      voteQuestion: null,
      voteRules: null,
    });
  });

  it("protects categories with known dependencies or official votes", () => {
    expect(buildCategoryUsage(category, 1, 0).canDelete).toBe(false);
    expect(buildCategoryUsage(category, 0, 0).canDelete).toBe(false);
    expect(buildCategoryUsage({ ...category, kind: CATEGORY_KIND.STICKER }, 0, 0).canDelete).toBe(true);
  });

  it("maps an API category to an editable form", () => {
    expect(buildCategoryForm(category)).toEqual({
      description: "Descrição",
      isActive: true,
      kind: "UserVote",
      name: "Categoria",
      sortOrder: "3",
      voteQuestion: "Quem?",
      voteRules: "Uma escolha",
    });
  });
});
