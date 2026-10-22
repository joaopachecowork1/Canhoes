import { describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { comment, member, post } from "@/tests/component/fixtures";
import { makeEventContext } from "@/tests/component/eventContext";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";
import { signInAs } from "@/tests/component/session";

import { OPEN_COMPOSE_SHEET_EVENT } from "@/lib/canhoesEvent";

import { HubFeedModule } from "./HubFeedModule";

/*
 * The mural end to end in the browser: real hooks, repositories and fetch against the fake API.
 * Each test sets only the endpoints its scenario uses (unhandled requests fail the test).
 */

const context = makeEventContext({ modules: { feed: true } });
const POSTS = "*/api/v1/events/event-1/feed/posts";

function servePosts(posts: ReturnType<typeof post>[], { hasMore = false, total = posts.length } = {}) {
  server.use(
    http.get(POSTS, () => HttpResponse.json({ items: posts, total, skip: 0, take: 15, hasMore })),
    http.get("*/api/v1/events/event-1/members", () =>
      HttpResponse.json([
        member({ id: "ana", displayName: "Ana" }),
        member({ id: "rui", displayName: "Rui Costa", color: "pink" }),
      ]),
    ),
  );
}

/** The score between the up and down arrows of the (only) post. */
const score = () => screen.getByRole("button", { name: /upvote/i }).parentElement?.querySelector("span")?.textContent;

function renderFeed() {
  return renderWithProviders(<HubFeedModule initialContext={context} />);
}

describe("HubFeedModule", () => {
  it("lists the event's posts with author, text and score", async () => {
    servePosts([post({ text: "Primeiro post", postNumber: 7, likeCount: 3, downvoteCount: 1, commentCount: 2 })]);
    renderFeed();

    expect(await screen.findByText("Primeiro post")).toBeInTheDocument();
    expect(screen.getByText("Rui")).toBeInTheDocument();
    expect(screen.queryByText("Nº 7")).not.toBeInTheDocument();
    expect(score()).toBe("2"); // 3 likes - 1 downvote
    expect(screen.getByRole("button", { name: "2 comentários" })).toBeInTheDocument();
  });

  it("shows the group's cromos and opens the composer from the empty slot", async () => {
    servePosts([]);
    const onOpenCompose = vi.fn();
    globalThis.addEventListener(OPEN_COMPOSE_SHEET_EVENT, onOpenCompose);
    renderFeed();

    const strip = await screen.findByRole("list", { name: "Membros" });
    expect(await within(strip).findByText("Rui Costa")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cola aqui a tua publicação" }));

    expect(onOpenCompose).toHaveBeenCalledOnce();
    globalThis.removeEventListener(OPEN_COMPOSE_SHEET_EVENT, onOpenCompose);
  });

  it("shows the empty mural", async () => {
    servePosts([]);
    renderFeed();
    expect(await screen.findByText("Ainda ninguém publicou no mural")).toBeInTheDocument();
  });

  it("offers a retry when the posts fail to load", async () => {
    servePosts([]);
    server.use(http.get(POSTS, () => HttpResponse.json({ message: "boom" }, { status: 500 })));
    renderFeed();
    expect(await screen.findByText("Não deu para abrir o mural. Tenta outra vez.")).toBeInTheDocument();

    servePosts([post({ text: "Voltou" })]);
    await userEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText("Voltou")).toBeInTheDocument();
  });

  it("upvotes optimistically and keeps the server's answer", async () => {
    servePosts([post()]);
    server.use(http.post(`${POSTS}/post-1/like`, () => HttpResponse.json({ liked: true })));
    renderFeed();

    await userEvent.click(await screen.findByRole("button", { name: "Upvote" }));
    expect(screen.getByRole("button", { name: "Remover upvote" })).toBeInTheDocument();
    expect(score()).toBe("1");
    expect(await screen.findByText("Reação atualizada")).toBeInTheDocument();
  });

  it("rolls the upvote back when the server refuses it", async () => {
    servePosts([post()]);
    server.use(http.post(`${POSTS}/post-1/like`, () => HttpResponse.json({ message: "não" }, { status: 409 })));
    renderFeed();

    await userEvent.click(await screen.findByRole("button", { name: "Upvote" }));
    expect(await screen.findByText(/O estado mudou entretanto/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upvote" })).toBeInTheDocument();
    expect(score()).toBe("0");
  });

  it("downvotes, cancelling an active upvote", async () => {
    servePosts([post({ likedByMe: true, likeCount: 1 })]);
    server.use(http.post(`${POSTS}/post-1/downvote`, () => HttpResponse.json({ downvoted: true })));
    renderFeed();

    await userEvent.click(await screen.findByRole("button", { name: "Downvote" }));
    expect(await screen.findByRole("button", { name: "Remover downvote" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upvote" })).toBeInTheDocument();
    expect(score()).toBe("-1");
  });

  it("opens the comments, replies and counts the new comment", async () => {
    servePosts([post({ commentCount: 1 })]);
    const created = comment({ id: "comment-2", userId: "ana", userName: "Ana", text: "Também acho" });
    server.use(
      http.get(`${POSTS}/post-1/comments`, () => HttpResponse.json([comment()])),
      http.post(`${POSTS}/post-1/comments`, () => HttpResponse.json(created)),
    );
    renderFeed();

    await userEvent.click(await screen.findByRole("button", { name: "1 comentários" }));
    expect(await screen.findByText("Concordo")).toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText(/Escreve um comentário/), "Também acho");
    await userEvent.click(screen.getByRole("button", { name: "Enviar resposta" }));

    expect(await screen.findByText("Comentário publicado")).toBeInTheDocument();
    expect(screen.getByText("Também acho")).toBeInTheDocument();
    expect(screen.getByText("2 comentários")).toBeInTheDocument();
  });

  it("lets the author delete their own comment", async () => {
    signInAs({ id: "rui", name: "Rui" });
    servePosts([post({ commentCount: 1 })]);
    server.use(
      http.get(`${POSTS}/post-1/comments`, () => HttpResponse.json([comment()])),
      http.delete(`${POSTS}/post-1/comments/comment-1`, () => new HttpResponse(null, { status: 204 })),
    );
    renderFeed();

    await userEvent.click(await screen.findByRole("button", { name: "1 comentários" }));
    await userEvent.click(await screen.findByRole("button", { name: "Apagar comentário" }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Eliminar" }));

    expect(await screen.findByText("Comentário removido")).toBeInTheDocument();
    expect(screen.queryByText("Concordo")).not.toBeInTheDocument();
  });

  it("votes in a poll and shows the new counts", async () => {
    const poll = {
      question: "Quem ganha?",
      myOptionId: null,
      totalVotes: 1,
      options: [
        { id: "o1", text: "Ana", voteCount: 1 },
        { id: "o2", text: "Rui", voteCount: 0 },
      ],
    };
    servePosts([post({ poll })]);
    server.use(http.post(`${POSTS}/post-1/poll/vote`, () => new HttpResponse(null, { status: 204 })));
    renderFeed();

    await userEvent.click(await screen.findByRole("button", { name: /^Rui.*0 · 0%/ }));
    expect(await screen.findByRole("button", { name: /^Rui.*1 · 50%/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/2 votos registados/)).toBeInTheDocument();
  });

  it("loads more posts on request", async () => {
    let lastSkip = 0;
    server.use(
      http.get(POSTS, ({ request }) => {
        lastSkip = Number(new URL(request.url).searchParams.get("skip"));
        const items = lastSkip === 0 ? [post({ id: "p1", text: "Página 1" })] : [post({ id: "p2", text: "Página 2" })];
        return HttpResponse.json({ items, total: 16, skip: lastSkip, take: 15, hasMore: lastSkip === 0 });
      }),
    );
    renderFeed();

    await userEvent.click(await screen.findByRole("button", { name: "Carregar mais publicações manualmente" }));
    expect(await screen.findByText("Página 2")).toBeInTheDocument();
    expect(lastSkip).toBe(15); // the next page starts after the first 15 posts
  });

  const openPostMenu = async () => userEvent.click(await screen.findByRole("button", { name: "Opções da publicação" }));

  describe("as admin", () => {
    it("pins a post", async () => {
      signInAs({ isAdmin: true });
      servePosts([post()]);
      server.use(http.post(`${POSTS}/post-1/pin`, () => HttpResponse.json({ pinned: true, pinnedOrder: 0 })));
      renderFeed();

      await openPostMenu();
      await userEvent.click(await screen.findByRole("button", { name: "Fixar publicação" }));
      expect(await screen.findByText("Fixado")).toBeInTheDocument();
      await openPostMenu();
      expect(await screen.findByRole("button", { name: "Subir publicação fixada" })).toBeInTheDocument();
    });

    it("deletes a post after confirming", async () => {
      signInAs({ isAdmin: true });
      servePosts([post({ text: "Para apagar" })]);
      server.use(http.delete(`${POSTS}/post-1`, () => new HttpResponse(null, { status: 204 })));
      renderFeed();

      await openPostMenu();
      await userEvent.click(await screen.findByRole("button", { name: "Eliminar publicação" }));
      await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Eliminar" }));

      expect(await screen.findByText("Publicação removida")).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByText("Para apagar")).not.toBeInTheDocument());
    });
  });

  describe("when the server refuses", () => {
    const refuse = (method: "post" | "delete" | "patch", path: string) =>
      http[method](`${POSTS}${path}`, () => HttpResponse.json({ message: "Recusado pelo servidor." }, { status: 409 }));

    it("keeps the reply when the comment is not published", async () => {
      servePosts([post({ commentCount: 1 })]);
      server.use(
        http.get(`${POSTS}/post-1/comments`, () => HttpResponse.json([comment()])),
        refuse("post", "/post-1/comments"),
      );
      renderFeed();

      await userEvent.click(await screen.findByRole("button", { name: "1 comentários" }));
      await userEvent.click(await screen.findByRole("button", { name: "Responder" }));
      expect(screen.getByText("A responder a")).toBeInTheDocument();
      await userEvent.type(screen.getByPlaceholderText(/Escreve a tua resposta/), "Não concordo");
      await userEvent.click(screen.getByRole("button", { name: "Enviar resposta" }));

      expect(await screen.findByText(/Recusado pelo servidor/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Escreve a tua resposta/)).toHaveValue("Não concordo");
      await userEvent.click(screen.getByRole("button", { name: "Cancelar resposta" }));
      expect(screen.queryByText("A responder a")).not.toBeInTheDocument();
    });

    it("puts the comment back when it cannot be deleted", async () => {
      signInAs({ id: "rui", name: "Rui" });
      servePosts([post({ commentCount: 1 })]);
      server.use(
        http.get(`${POSTS}/post-1/comments`, () => HttpResponse.json([comment()])),
        refuse("delete", "/post-1/comments/comment-1"),
      );
      renderFeed();

      await userEvent.click(await screen.findByRole("button", { name: "1 comentários" }));
      await userEvent.click(await screen.findByRole("button", { name: "Apagar comentário" }));
      await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Eliminar" }));

      expect(await screen.findByText(/Recusado pelo servidor/)).toBeInTheDocument();
      expect(screen.getByText("Concordo")).toBeInTheDocument();
    });

    it("undoes a poll vote", async () => {
      const poll = {
        question: "Quem ganha?",
        myOptionId: null,
        totalVotes: 0,
        options: [{ id: "o1", text: "Ana", voteCount: 0 }],
      };
      servePosts([post({ poll })]);
      server.use(refuse("post", "/post-1/poll/vote"));
      renderFeed();

      await userEvent.click(await screen.findByRole("button", { name: /^Ana.*0 · 0%/ }));
      expect(await screen.findByText(/Recusado pelo servidor/)).toBeInTheDocument();
      expect(await screen.findByRole("button", { name: /^Ana.*0 · 0%/ })).toHaveAttribute("aria-pressed", "false");
    });

    it("keeps the post when it cannot be pinned or deleted", async () => {
      signInAs({ isAdmin: true });
      servePosts([post({ text: "Fica" })]);
      server.use(refuse("post", "/post-1/pin"), refuse("delete", "/post-1"));
      renderFeed();

      await openPostMenu();
      await userEvent.click(await screen.findByRole("button", { name: "Fixar publicação" }));
      expect(await screen.findByText(/Recusado pelo servidor/)).toBeInTheDocument();
      expect(screen.queryByText("Fixado")).not.toBeInTheDocument();

      await openPostMenu();
      await userEvent.click(await screen.findByRole("button", { name: "Eliminar publicação" }));
      await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Eliminar" }));
      await waitFor(() => expect(screen.getAllByText(/Recusado pelo servidor/).length).toBeGreaterThan(0));
      expect(screen.getByText("Fica")).toBeInTheDocument();
    });

    it("moves a pinned post", async () => {
      signInAs({ isAdmin: true });
      servePosts([
        post({ id: "post-1", text: "Um", isPinned: true, pinnedOrder: 0 }),
        post({ id: "post-2", text: "Dois", isPinned: true, pinnedOrder: 1 }),
      ]);
      const directions: unknown[] = [];
      server.use(
        http.patch(`${POSTS}/post-2/pin`, async ({ request }) => {
          directions.push(await request.json());
          return HttpResponse.json({ success: true });
        }),
      );
      renderFeed();

      const [, secondPostMenu] = await screen.findAllByRole("button", { name: "Opções da publicação" });
      await userEvent.click(secondPostMenu);
      await userEvent.click(await screen.findByRole("button", { name: "Subir publicação fixada" }));
      await waitFor(() => expect(directions).toEqual([{ direction: "up" }]));
    });
  });
});
