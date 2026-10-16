import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";

import { awardsRepo } from "@/lib/repositories/awardsRepo";
import { makeEventContext } from "@/tests/component/eventContext";
import { renderWithProviders } from "@/tests/component/renderWithProviders";

import { CanhoesGalaModule } from "./CanhoesGalaModule";

vi.mock("@/lib/repositories/awardsRepo", () => ({ awardsRepo: { getResults: vi.fn() } }));

const context = makeEventContext({ phaseType: "RESULTS", modules: { gala: true } });

describe("CanhoesGalaModule", () => {
  it("ranks each category's nominees and marks the winner", async () => {
    vi.mocked(awardsRepo.getResults).mockResolvedValue([
      {
        categoryId: "c1",
        categoryName: "Canhão do Ano",
        totalVotes: 5,
        top: [
          { nomineeId: "n1", title: "Ana", imageUrl: null, voteCount: 4 },
          { nomineeId: "n2", title: "Rui", imageUrl: null, voteCount: 1 },
        ],
      },
    ]);

    renderWithProviders(<CanhoesGalaModule initialContext={context} />);

    expect(await screen.findByText("Canhão do Ano")).toBeInTheDocument();
    expect(screen.getByText("Vencedor")).toBeInTheDocument();
    expect(screen.getByText("4 votos")).toBeInTheDocument();
    expect(screen.getByText("1 voto")).toBeInTheDocument();
  });

  it("says when there are no results yet", async () => {
    vi.mocked(awardsRepo.getResults).mockResolvedValue([]);
    renderWithProviders(<CanhoesGalaModule initialContext={context} />);
    expect(await screen.findByText("Sem resultados ainda.")).toBeInTheDocument();
  });

  it("offers a retry when loading fails", async () => {
    vi.mocked(awardsRepo.getResults).mockRejectedValue(new Error("rede em baixo"));
    renderWithProviders(<CanhoesGalaModule initialContext={context} />);
    expect(await screen.findByText("Erro ao carregar resultados")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });
});
