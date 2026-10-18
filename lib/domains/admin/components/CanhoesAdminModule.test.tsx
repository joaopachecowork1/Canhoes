import { describe, expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { AdminNomineeDto } from "@/lib/api/types";
import { apiRoute, recordRequests } from "@/tests/component/api";
import { makeEventContext } from "@/tests/component/eventContext";
import {
  adminBootstrap,
  adminNominee,
  category,
  categoryProposal,
  measureProposal,
  member,
  officialResult,
  paged,
  secretSantaState,
  vote,
} from "@/tests/component/fixtures";
import { router, setNavigation } from "@/tests/component/navigation";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";
import { signInAs } from "@/tests/component/session";

import CanhoesAdminModule from "./CanhoesAdminModule";
import type { AdminSectionId } from "./adminSections";

const ADMIN = "events/event-1/admin";

function serveAdmin({ nominations = [adminNominee({ id: "nom-1", title: "O jantar" })] }: { nominations?: AdminNomineeDto[] } = {}) {
  server.use(
    // Every admin write refreshes the shell's overview too.
    apiRoute("get", "events/active/context", makeEventContext({ isAdmin: true })),
    apiRoute("get", `${ADMIN}/bootstrap`, adminBootstrap()),
    apiRoute("get", `${ADMIN}/category-proposals`, paged([categoryProposal({ id: "cp-1", name: "Melhor sticker" })])),
    apiRoute("get", `${ADMIN}/measure-proposals`, paged([measureProposal()])),
    apiRoute("get", `${ADMIN}/nominations/paged`, { total: nominations.length, nominations, skip: 0, take: 50, hasMore: false }),
    apiRoute("get", `${ADMIN}/categories`, [category(), category({ id: "cat-2", name: "Membro do ano", kind: 1, isActive: false })]),
    apiRoute("get", `${ADMIN}/members/paged`, paged([member({ id: "ana", displayName: "Ana", isAdmin: true }), member({ id: "rui", displayName: "Rui" })])),
    apiRoute("get", `${ADMIN}/secret-santa/state`, secretSantaState()),
    apiRoute("get", `${ADMIN}/votes/paged`, { total: 1, votes: [vote()], skip: 0, take: 1000, hasMore: false }),
    apiRoute("get", `${ADMIN}/official-results/paged`, paged([officialResult()]))
  );
}

function renderAdmin(section: AdminSectionId = "conteudo") {
  signInAs({ id: "ana", name: "Ana", isAdmin: true });
  return renderWithProviders(<CanhoesAdminModule section={section} initialContext={makeEventContext({ isAdmin: true })} />);
}

describe("CanhoesAdminModule — content queue", () => {
  it("shows pending nominations and proposals with the queue count", async () => {
    serveAdmin();
    renderAdmin();

    expect(await screen.findByText("O jantar")).toBeInTheDocument();
    expect(await screen.findByText("Melhor sticker")).toBeInTheDocument();
    expect(screen.getByText("Quem perder paga uma rodada")).toBeInTheDocument();
    expect(within(screen.getByRole("button", { name: /Fila/ })).getByText("3")).toBeInTheDocument();
  });

  it("approves a nomination from its drawer", async () => {
    serveAdmin();
    const recorder = recordRequests();
    server.use(
      http.post(`*/api/v1/${ADMIN}/nominations/nom-1/approve`, async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json(adminNominee({ id: "nom-1", status: "approved" }));
      })
    );
    renderAdmin();

    await userEvent.click(await screen.findByRole("button", { name: /O jantar/ }));
    await userEvent.click(await screen.findByRole("button", { name: 'Aprovar nomeação "O jantar"' }));

    expect(await screen.findByText("Nomeação aprovada.")).toBeInTheDocument();
    expect(recorder.requests.map((request) => request.method)).toEqual(["POST"]);
  });

  it("rejects a nomination after confirming", async () => {
    serveAdmin();
    server.use(apiRoute("post", `${ADMIN}/nominations/nom-1/reject`, adminNominee({ id: "nom-1", status: "rejected" })));
    renderAdmin();

    await userEvent.click(await screen.findByRole("button", { name: /O jantar/ }));
    await userEvent.click(await screen.findByRole("button", { name: 'Rejeitar nomeação "O jantar"' }));
    await userEvent.click(await screen.findByRole("button", { name: "Confirmar rejeição" }));

    expect(await screen.findByText("Nomeação rejeitada.")).toBeInTheDocument();
  });

  it("approves a category proposal with the edited name", async () => {
    serveAdmin();
    const recorder = recordRequests();
    server.use(
      http.put(`*/api/v1/${ADMIN}/category-proposals/cp-1`, async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json(categoryProposal({ id: "cp-1", status: "approved" }));
      })
    );
    renderAdmin();

    await userEvent.click(await screen.findByRole("button", { name: /Melhor sticker/ }));
    const name = await screen.findByLabelText("Nome da categoria");
    await userEvent.clear(name);
    await userEvent.type(name, "Sticker do ano");
    await userEvent.click(screen.getByRole("button", { name: "Aprovar" }));

    expect(await screen.findByText("Proposta aprovada")).toBeInTheDocument();
    expect(recorder.requests[0]?.body).toMatchObject({ name: "Sticker do ano", status: "approved" });
  });

  it("says so when there is nothing to moderate", async () => {
    serveAdmin({ nominations: [] });
    renderAdmin();
    expect(await screen.findByText("Sem nomeações pendentes.")).toBeInTheDocument();
  });

  it("shows the load error with a retry", async () => {
    serveAdmin();
    server.use(apiRoute("get", `${ADMIN}/bootstrap`, { message: "boom" }, 500));
    renderAdmin();

    expect(await screen.findByText("Erro ao carregar o admin")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Tentar novamente" }).length).toBeGreaterThan(0);
  });
});

describe("CanhoesAdminModule — categories and results", () => {
  it("lists the categories and creates a new one", async () => {
    serveAdmin();
    setNavigation({ pathname: "/canhoes/admin/conteudo", search: "view=categorias" });
    const recorder = recordRequests();
    server.use(
      http.post(`*/api/v1/${ADMIN}/categories`, async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json(category({ id: "cat-3", name: "Revelação" }), { status: 201 });
      })
    );
    renderAdmin();

    expect(await screen.findByText("Canhão do Ano")).toBeInTheDocument();
    expect(screen.getByText("Membro do ano")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /Nova categoria/ }));
    await userEvent.type(await screen.findByLabelText("Nome"), "Revelação");
    await userEvent.click(screen.getByRole("button", { name: "Criar categoria" }));

    expect(await screen.findByText("Categoria criada.")).toBeInTheDocument();
    expect(recorder.requests[0]?.body).toMatchObject({ name: "Revelação" });
  });

  it("switches views through the URL", async () => {
    serveAdmin();
    setNavigation({ pathname: "/canhoes/admin/conteudo" });
    renderAdmin();

    await userEvent.click(await screen.findByRole("button", { name: /Resultados/ }));
    expect(router.replace).toHaveBeenCalledWith("/canhoes/admin/conteudo?view=resultados");
  });

  it("shows the official results and the vote audit", async () => {
    serveAdmin();
    setNavigation({ pathname: "/canhoes/admin/conteudo", search: "view=resultados" });
    renderAdmin();

    expect(await screen.findByText("Resultados oficiais")).toBeInTheDocument();
    expect(await screen.findByText("Histórico de votos")).toBeInTheDocument();
    expect(screen.getAllByText("Canhão do Ano").length).toBeGreaterThan(0);
  });
});

describe("CanhoesAdminModule — members", () => {
  it("lists members and toggles another member's admin role", async () => {
    serveAdmin();
    const recorder = recordRequests();
    server.use(
      http.patch(`*/api/v1/${ADMIN}/members/rui/role`, async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json({ user: { id: "rui", isAdmin: true } });
      })
    );
    renderAdmin("membros");

    expect(await screen.findByText("Rui")).toBeInTheDocument();
    expect(screen.getByText("Aguardando sorteio inicial.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("switch", { name: "Admin: Rui" }));

    expect(await screen.findByText("Permissões atualizadas.")).toBeInTheDocument();
    expect(recorder.requests[0]?.body).toEqual({ isAdmin: true, confirmSelfDemotion: false });
  });

  it("generates an invite link", async () => {
    serveAdmin();
    server.use(http.post("*/api/admin/invites", () => HttpResponse.json({ inviteUrl: "/canhoes/register?token=abc" })));
    renderAdmin("membros");

    await userEvent.type(await screen.findByPlaceholderText("Email do utilizador"), "eva@canhoes.pt");
    await userEvent.click(screen.getByRole("button", { name: "Gerar Convite" }));

    expect(await screen.findByText("Convite gerado!")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/register\?token=abc/)).toBeInTheDocument();
  });

  it("runs the secret santa draw", async () => {
    serveAdmin();
    server.use(apiRoute("post", `${ADMIN}/secret-santa/draw`, secretSantaState({ hasDraw: true, assignmentCount: 4 })));
    renderAdmin("membros");

    await userEvent.click(await screen.findByRole("button", { name: "Realizar sorteio" }));
    expect(await screen.findByText("Sorteio realizado. Ainda ninguém o vê até o revelares.")).toBeInTheDocument();
  });
});

describe("CanhoesAdminModule — event settings", () => {
  it("switches an area off", async () => {
    serveAdmin();
    const recorder = recordRequests();
    server.use(
      http.patch("*/api/v1/events/event-1/modules", async ({ request }) => {
        await recorder.capture(request);
        return HttpResponse.json(makeEventContext().overview);
      })
    );
    renderAdmin("configuracoes");

    await userEvent.click(await screen.findByRole("switch", { name: "Wishlist ligada" }));

    expect(await screen.findByText("Wishlist desligado.")).toBeInTheDocument();
    expect(recorder.requests[0]?.body).toEqual({ modules: { wishlist: false } });
  });

  it("closes proposals", async () => {
    serveAdmin();
    server.use(apiRoute("put", `${ADMIN}/state`, adminBootstrap().state));
    renderAdmin("configuracoes");

    await userEvent.click(await screen.findByRole("switch", { name: "Aceitar propostas" }));
    expect(await screen.findByText("Propostas fechadas.")).toBeInTheDocument();
  });
});
