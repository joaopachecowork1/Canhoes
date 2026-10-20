import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";

import { awardsRepo } from "@/lib/repositories/awardsRepo";
import { makeEventContext } from "@/tests/component/eventContext";
import { renderWithProviders } from "@/tests/component/renderWithProviders";

import { CanhoesGalaModule } from "./CanhoesGalaModule";

vi.mock("@/lib/repositories/awardsRepo", () => ({ awardsRepo: { getResults: vi.fn() } }));

const context = makeEventContext({ phaseType: "RESULTS", modules: { gala: true } });
const votingContext = makeEventContext({ phaseType: "VOTING", modules: { gala: true } });

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

  it("gives the winner's full name room, says the place once, and shows the runners-up smaller", async () => {
    vi.mocked(awardsRepo.getResults).mockResolvedValue([
      {
        categoryId: "c1",
        categoryName: "Canhão do Ano",
        totalVotes: 7,
        top: [
          { nomineeId: "n1", title: "O tombo mais espetacular da noite de Natal", imageUrl: null, voteCount: 4 },
          { nomineeId: "n2", title: "Rui", imageUrl: null, voteCount: 2 },
          { nomineeId: "n3", title: "Bia", imageUrl: null, voteCount: 1 },
        ],
      },
    ]);

    renderWithProviders(<CanhoesGalaModule initialContext={context} />);

    const winner = await screen.findByRole("heading", { name: "O tombo mais espetacular da noite de Natal" });
    expect(winner.className).not.toContain("truncate");
    expect(screen.getAllByText("Vencedor")).toHaveLength(1);
    expect(screen.queryByText("#1")).not.toBeInTheDocument();
    expect(screen.getByText("2.º")).toBeInTheDocument();
    expect(screen.getByText("3.º")).toBeInTheDocument();
  });

  it("does not show a broken-image placeholder for a nominee without a picture", async () => {
    vi.mocked(awardsRepo.getResults).mockResolvedValue([
      { categoryId: "c1", categoryName: "Canhão do Ano", totalVotes: 1, top: [{ nomineeId: "n1", title: "Ana", imageUrl: null, voteCount: 1 }] },
    ]);

    const { container } = renderWithProviders(<CanhoesGalaModule initialContext={context} />);

    await screen.findByText("Canhão do Ano");
    expect(container.querySelector(".lucide-image-off")).toBeNull();
  });

  it("says when there are no results yet", async () => {
    vi.mocked(awardsRepo.getResults).mockResolvedValue([]);
    renderWithProviders(<CanhoesGalaModule initialContext={votingContext} />);
    expect(await screen.findByText("A gala ainda não tem resultados")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Voltar ao mural" })).toHaveAttribute("href", "/canhoes");
    // A "0 votos" badge would only say what the empty state already says.
    expect(screen.queryByText(/votos?$/)).not.toBeInTheDocument();
  });

  it("says nobody voted, instead of promising results, once the results phase is open", async () => {
    vi.mocked(awardsRepo.getResults).mockResolvedValue([]);
    renderWithProviders(<CanhoesGalaModule initialContext={context} />);

    expect(await screen.findByText("Ninguém votou este ano")).toBeInTheDocument();
    expect(screen.queryByText(/quando a votação fechar/)).not.toBeInTheDocument();
  });

  it("promises the results while the voting is still going on", async () => {
    vi.mocked(awardsRepo.getResults).mockResolvedValue([]);
    renderWithProviders(<CanhoesGalaModule initialContext={votingContext} />);

    expect(await screen.findByText("A gala ainda não tem resultados")).toBeInTheDocument();
    expect(screen.getByText(/quando a votação fechar/)).toBeInTheDocument();
  });

  it("shows one panel, not a card per category, while no category has a ranking yet", async () => {
    vi.mocked(awardsRepo.getResults).mockResolvedValue([
      { categoryId: "c1", categoryName: "Canhão do Ano", totalVotes: 0, top: [] },
      { categoryId: "c2", categoryName: "Melhor Foto", totalVotes: 0, top: [] },
    ]);
    renderWithProviders(<CanhoesGalaModule initialContext={votingContext} />);

    expect(await screen.findByText("A gala ainda não tem resultados")).toBeInTheDocument();
    expect(screen.queryByText("Canhão do Ano")).not.toBeInTheDocument();
    expect(screen.queryByText("Esta categoria não teve nomeações.")).not.toBeInTheDocument();
  });

  it("offers a retry when loading fails", async () => {
    vi.mocked(awardsRepo.getResults).mockRejectedValue(new Error("rede em baixo"));
    renderWithProviders(<CanhoesGalaModule initialContext={context} />);
    expect(await screen.findByText("Não deu para abrir os resultados")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });
});
