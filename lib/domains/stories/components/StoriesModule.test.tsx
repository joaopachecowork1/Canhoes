import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import type { StoryAuthorDto } from "@/lib/api/types";
import { apiRoute } from "@/tests/component/api";
import { makeEventContext } from "@/tests/component/eventContext";
import { member } from "@/tests/component/fixtures";
import { renderWithProviders } from "@/tests/component/renderWithProviders";
import { server } from "@/tests/component/server";
import { signInAs } from "@/tests/component/session";

import { StoriesModule } from "./StoriesModule";

/*
 * The stories end to end in the browser: real hooks, repository and fetch against the fake API.
 * Each test sets only the endpoints its scenario uses (unhandled requests fail the test).
 */

const context = makeEventContext({ modules: { feed: true } });
const STORIES = "*/api/v1/events/event-1/stories";
const HOUR_MS = 60 * 60 * 1000;

const story = (id: string) => ({
  id,
  createdAtUtc: new Date(Date.now() - 2 * HOUR_MS).toISOString(),
  expiresAtUtc: new Date(Date.now() + 22 * HOUR_MS).toISOString(),
  mediaUrl: `/api/v1/events/event-1/stories/${id}/media`,
});
const author = (authorUserId: string, authorName: string, ...ids: string[]): StoryAuthorDto => ({
  authorUserId,
  authorName,
  authorColor: "teal",
  stories: ids.map(story),
});

/** Ana (the signed-in member) has two stories and Rui has one. */
const GROUPS = [author("ana", "Ana", "a1", "a2"), author("rui", "Rui", "r1")];

/** The group: Ana (who is signed in) and Rui have stories, Eva has none. */
const MEMBERS = [
  member({ id: "ana", displayName: "Ana" }),
  member({ id: "rui", displayName: "Rui", color: "pink" }),
  member({ id: "eva", displayName: "Eva", color: "lime" }),
];

function serveStories(groups: StoryAuthorDto[] = GROUPS) {
  server.use(
    http.get(STORIES, () => HttpResponse.json(groups)),
    http.get("*/api/v1/events/event-1/members", () => HttpResponse.json(MEMBERS)),
  );
}

function renderStories() {
  return renderWithProviders(<StoriesModule initialContext={context} />);
}

/** Opens the viewer on a member's stories. */
async function openStoriesOf(name: string) {
  renderStories();
  await userEvent.click(await screen.findByRole("button", { name: `Ver as stories de ${name}` }));
  return screen.findByRole("dialog");
}

/** The image the viewer is showing. */
const shownStory = (dialog: HTMLElement) => within(dialog).getByRole("img") as HTMLImageElement;

/** The bar of the story being shown, which fills up as the time goes. */
const currentBar = (dialog: HTMLElement) =>
  within(dialog).getByRole("listitem", { current: "step" }).firstElementChild as HTMLElement;

function mockReducedMotion() {
  vi.spyOn(globalThis, "matchMedia").mockImplementation((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  }));
}

afterEach(() => {
  vi.restoreAllMocks();
  // Um relógio falso nunca pode passar para o teste seguinte, mesmo que o teste que o ligou falhe a meio.
  vi.useRealTimers();
});

describe("the stories strip", () => {
  it("shows who has stories and offers to publish one", async () => {
    serveStories();
    renderStories();

    const strip = await screen.findByRole("region", { name: "Stories" });
    expect(await within(strip).findByRole("button", { name: "Ver as stories de Ana" })).toBeInTheDocument();
    expect(within(strip).getByRole("button", { name: "Ver as stories de Rui" })).toBeInTheDocument();
    expect(within(strip).getByRole("button", { name: "Publicar uma story" })).toBeInTheDocument();
  });

  it("shows the whole group in the same strip, those with stories first", async () => {
    serveStories([author("rui", "Rui", "r1"), author("ana", "Ana", "a1")]);
    renderStories();

    const list = await screen.findByRole("list", { name: "Membros e stories" });
    await within(list).findByText("Eva");

    // O que se lê é a legenda: as iniciais do avatar estão escondidas aos leitores de ecrã.
    const names = within(list)
      .getAllByRole("listitem")
      .map((item) => item.querySelector(".truncate")?.textContent);
    expect(names).toEqual(["A tua story", "Rui", "Ana", "Eva"]);
  });

  it("can be scrolled with the keyboard, even when only members without stories are left to reach", async () => {
    serveStories();
    renderStories();

    expect(await screen.findByRole("list", { name: "Membros e stories" })).toHaveAttribute("tabindex", "0");
  });

  it("only makes a button of the members who have stories", async () => {
    serveStories();
    renderStories();

    const list = await screen.findByRole("list", { name: "Membros e stories" });
    expect(await within(list).findByText("Eva")).toBeInTheDocument();
    expect(within(list).queryByRole("button", { name: /Eva/ })).not.toBeInTheDocument();
    expect(within(list).getByRole("button", { name: "Ver as stories de Ana" })).toBeInTheDocument();
  });

  it("shows the author of a story who is not a member of the group", async () => {
    serveStories([author("boss", "Chefe", "b1")]);
    renderStories();

    expect(await screen.findByRole("button", { name: "Ver as stories de Chefe" })).toBeInTheDocument();
  });

  it("still lets the member publish when nobody has a story yet", async () => {
    serveStories([]);
    renderStories();

    expect(await screen.findByRole("button", { name: "Publicar uma story" })).toBeInTheDocument();
    expect(await screen.findByText("Eva")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ver as stories/ })).not.toBeInTheDocument();
  });
});

describe("coming back to the page", () => {
  it("looks for new and expired stories when the tab is shown again after a while", async () => {
    let fetches = 0;
    server.use(
      http.get(STORIES, () => {
        fetches += 1;
        return HttpResponse.json(GROUPS);
      }),
      http.get("*/api/v1/events/event-1/members", () => HttpResponse.json(MEMBERS)),
    );
    renderStories();
    await screen.findByRole("button", { name: "Ver as stories de Ana" });
    expect(fetches).toBe(1);

    // Só o relógio avança: a lista passa a velha, como depois de um tempo longe do separador.
    vi.useFakeTimers({ toFake: ["Date"], now: Date.now() + 2 * 60 * 1000 });
    document.dispatchEvent(new Event("visibilitychange", { bubbles: true }));

    await waitFor(() => expect(fetches).toBe(2));
  });
});

describe("watching stories", () => {
  it("opens on the first story of the chosen member", async () => {
    serveStories();
    const dialog = await openStoriesOf("Rui");

    expect(within(dialog).getByRole("heading", { name: "Stories de Rui" })).toBeInTheDocument();
    expect(shownStory(dialog)).toHaveAttribute("src", "/api/v1/events/event-1/stories/r1/media");
    expect(shownStory(dialog)).toHaveAccessibleName("Story de Rui");
    expect(within(dialog).getByText("Rui, story 1 de 1")).toBeInTheDocument();
  });

  it("walks forward and back across stories and members, and closes after the last one", async () => {
    serveStories();
    const dialog = await openStoriesOf("Ana");

    await userEvent.click(within(dialog).getByRole("button", { name: "Story seguinte" }));
    expect(shownStory(dialog)).toHaveAttribute("src", expect.stringContaining("/a2/media"));
    await userEvent.click(within(dialog).getByRole("button", { name: "Story seguinte" }));
    expect(within(dialog).getByRole("heading", { name: "Stories de Rui" })).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Story anterior" }));
    expect(shownStory(dialog)).toHaveAttribute("src", expect.stringContaining("/a2/media"));

    await userEvent.click(within(dialog).getByRole("button", { name: "Story seguinte" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Story seguinte" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("moves on by itself when the bar is full, but only once the image has loaded", async () => {
    serveStories();
    const dialog = await openStoriesOf("Ana");

    expect(currentBar(dialog).style.animationPlayState).toBe("paused");
    fireEvent.load(shownStory(dialog));
    expect(currentBar(dialog).style.animationPlayState).toBe("running");

    fireEvent.animationEnd(currentBar(dialog));
    expect(shownStory(dialog)).toHaveAttribute("src", expect.stringContaining("/a2/media"));
  });

  it("waits for the image again when going back to a story before the next one had loaded", async () => {
    serveStories();
    const dialog = await openStoriesOf("Ana");
    fireEvent.load(shownStory(dialog));

    await userEvent.click(within(dialog).getByRole("button", { name: "Story seguinte" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Story anterior" }));

    // A imagem voltou a pedir-se: a barra só corre depois de ela carregar outra vez.
    expect(shownStory(dialog)).toHaveAttribute("src", expect.stringContaining("/a1/media"));
    expect(currentBar(dialog).style.animationPlayState).toBe("paused");
  });

  it("can be paused and resumed", async () => {
    serveStories();
    const dialog = await openStoriesOf("Ana");
    fireEvent.load(shownStory(dialog));

    await userEvent.click(within(dialog).getByRole("button", { name: "Pausar" }));
    expect(currentBar(dialog).style.animationPlayState).toBe("paused");

    await userEvent.click(within(dialog).getByRole("button", { name: "Retomar" }));
    expect(currentBar(dialog).style.animationPlayState).toBe("running");
  });

  it("does not move on by itself for someone who asked for less motion", async () => {
    mockReducedMotion();
    serveStories();
    const dialog = await openStoriesOf("Ana");
    fireEvent.load(shownStory(dialog));

    expect(currentBar(dialog).style.animationName).toBe("");
    fireEvent.animationEnd(currentBar(dialog));
    expect(shownStory(dialog)).toHaveAttribute("src", expect.stringContaining("/a1/media"));
  });

  it("closes with the close button and with Escape", async () => {
    serveStories();
    const dialog = await openStoriesOf("Ana");
    await userEvent.click(within(dialog).getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole("button", { name: "Ver as stories de Ana" }));
    await screen.findByRole("dialog");
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("says so when an image cannot be loaded and waits for a tap instead of moving on before it is read", async () => {
    serveStories();
    const dialog = await openStoriesOf("Ana");

    fireEvent.error(shownStory(dialog));

    expect(within(dialog).getByRole("status")).toHaveTextContent("Não deu para carregar esta story.");
    expect(currentBar(dialog).style.animationPlayState).toBe("paused");
  });
});

describe("deleting a story", () => {
  it("lets the author delete it after confirming, and goes on to the next one", async () => {
    serveStories();
    const deleted = vi.fn();
    server.use(
      http.delete(`${STORIES}/a1`, () => {
        deleted();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const dialog = await openStoriesOf("Ana");

    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar story" }));
    expect(within(dialog).getByText("Apagar esta story?")).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Cancelar" }));
    expect(within(dialog).queryByText("Apagar esta story?")).not.toBeInTheDocument();
    expect(deleted).not.toHaveBeenCalled();

    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar story" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar" }));

    await waitFor(() => expect(deleted).toHaveBeenCalledOnce());
    await waitFor(() => expect(shownStory(dialog)).toHaveAttribute("src", expect.stringContaining("/a2/media")));
    expect(await screen.findByText("Story apagada.")).toBeInTheDocument();
  });

  it("only closes the confirmation when the picture is tapped meanwhile, instead of moving on", async () => {
    serveStories();
    const deleted = vi.fn();
    server.use(
      http.delete(`${STORIES}/a1`, () => {
        deleted();
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const dialog = await openStoriesOf("Ana");

    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar story" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Story seguinte" }));

    expect(within(dialog).queryByText("Apagar esta story?")).not.toBeInTheDocument();
    expect(shownStory(dialog)).toHaveAttribute("src", expect.stringContaining("/a1/media"));
    expect(deleted).not.toHaveBeenCalled();
  });

  it("closes only the confirmation with Escape, and the viewer with the next one", async () => {
    serveStories();
    const dialog = await openStoriesOf("Ana");

    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar story" }));
    await userEvent.keyboard("{Escape}");
    expect(within(dialog).queryByText("Apagar esta story?")).not.toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("ignores the arrow keys while the confirmation is open, so what is deleted is what was asked", async () => {
    serveStories();
    const dialog = await openStoriesOf("Ana");

    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar story" }));
    await userEvent.keyboard("{ArrowRight}");

    expect(within(dialog).getByText("Apagar esta story?")).toBeInTheDocument();
    expect(shownStory(dialog)).toHaveAttribute("src", expect.stringContaining("/a1/media"));
  });

  it("keeps the rest of the viewer out of reach while the confirmation is open", async () => {
    serveStories();
    const dialog = await openStoriesOf("Ana");

    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar story" }));

    expect(within(dialog).getByRole("button", { name: "Pausar" }).closest("[inert]")).not.toBeNull();
  });

  it("does not move on while the story is being deleted", async () => {
    serveStories();
    let release: () => void = () => {};
    server.use(
      http.delete(`${STORIES}/a1`, async () => {
        await new Promise<void>((resolve) => (release = resolve));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const dialog = await openStoriesOf("Ana");
    fireEvent.load(shownStory(dialog));

    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar story" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Story seguinte" }));

    expect(shownStory(dialog)).toHaveAttribute("src", expect.stringContaining("/a1/media"));
    expect(currentBar(dialog).style.animationPlayState).toBe("paused");
    release();
    await waitFor(() => expect(shownStory(dialog)).toHaveAttribute("src", expect.stringContaining("/a2/media")));
  });

  it("treats a story that is already gone as deleted and moves on", async () => {
    serveStories();
    server.use(http.delete(`${STORIES}/a1`, () => HttpResponse.json({ code: "NOT_FOUND" }, { status: 404 })));
    const dialog = await openStoriesOf("Ana");
    fireEvent.load(shownStory(dialog));

    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar story" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar" }));

    await waitFor(() => expect(shownStory(dialog)).toHaveAttribute("src", expect.stringContaining("/a2/media")));
    expect(screen.queryByText("Não deu para apagar a story. Tenta outra vez.")).not.toBeInTheDocument();
  });

  it("closes the viewer when the last story is deleted", async () => {
    serveStories([author("ana", "Ana", "a1")]);
    server.use(http.delete(`${STORIES}/a1`, () => new HttpResponse(null, { status: 204 })));
    const dialog = await openStoriesOf("Ana");

    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar story" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("keeps the story and says so when the server refuses", async () => {
    serveStories();
    server.use(
      http.delete(`${STORIES}/a1`, () => HttpResponse.json({ code: "UNHANDLED_SERVER_ERROR" }, { status: 500 })),
    );
    const dialog = await openStoriesOf("Ana");

    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar story" }));
    await userEvent.click(within(dialog).getByRole("button", { name: "Apagar" }));

    expect(await screen.findByText(/O servidor teve um problema inesperado/)).toBeInTheDocument();
    expect(shownStory(dialog)).toHaveAttribute("src", expect.stringContaining("/a1/media"));
  });

  it("does not offer to delete someone else's story to a member, but does to an admin", async () => {
    serveStories();
    const dialog = await openStoriesOf("Rui");
    expect(within(dialog).queryByRole("button", { name: "Apagar story" })).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("offers an admin to delete anyone's story", async () => {
    signInAs({ id: "boss", name: "Chefe", isAdmin: true });
    serveStories();
    const dialog = await openStoriesOf("Rui");

    expect(within(dialog).getByRole("button", { name: "Apagar story" })).toBeInTheDocument();
  });
});

describe("publishing a story", () => {
  const photo = (name = "foto.png", type = "image/png") =>
    new File([new Uint8Array([137, 80, 78, 71])], name, { type });
  const fileInput = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[type="file"]')!;

  // jsdom não descodifica nem codifica imagens: um descodificador e um canvas de mentira deixam a recompressão correr.
  beforeEach(() => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 800, height: 600, close: vi.fn() })),
    );
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() => ({ drawImage: vi.fn() })) as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/webp;base64,");
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback, type) =>
      callback(new Blob([new Uint8Array([1, 2, 3])], { type })),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens the file picker from the publish button", async () => {
    serveStories();
    const openPicker = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(() => {});
    renderStories();

    await userEvent.click(await screen.findByRole("button", { name: "Publicar uma story" }));

    expect(openPicker).toHaveBeenCalledOnce();
  });

  it("sends the chosen image and shows the new story", async () => {
    let fetches = 0;
    server.use(
      http.get(STORIES, () => {
        fetches += 1;
        return HttpResponse.json(GROUPS);
      }),
      http.post(STORIES, () => HttpResponse.json({ id: "new", createdAtUtc: "", expiresAtUtc: "" }, { status: 201 })),
    );
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { container } = renderStories();
    await screen.findByRole("button", { name: "Ver as stories de Ana" });

    await userEvent.upload(fileInput(container), photo());

    expect(await screen.findByText("Story publicada. Desaparece daqui a 24 horas.")).toBeInTheDocument();
    const sent = fetchSpy.mock.calls.find(([, init]) => init?.method === "POST")?.[1]?.body;
    expect(sent).toBeInstanceOf(FormData);
    expect((sent as FormData).get("file")).toHaveProperty("name", "foto.webp");
    await waitFor(() => expect(fetches).toBe(2));
  });

  it("re-encodes the image before sending it, which drops the photo metadata", async () => {
    serveStories();
    server.use(
      http.post(STORIES, () => HttpResponse.json({ id: "new", createdAtUtc: "", expiresAtUtc: "" }, { status: 201 })),
    );
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { container } = renderStories();
    await screen.findByRole("button", { name: "Ver as stories de Ana" });

    await userEvent.upload(fileInput(container), photo());

    await screen.findByText("Story publicada. Desaparece daqui a 24 horas.");
    const sent = fetchSpy.mock.calls.find(([, init]) => init?.method === "POST")?.[1]?.body;
    expect((sent as FormData).get("file")).toMatchObject({ name: "foto.webp", type: "image/webp" });
  });

  it("does not send the original when the image cannot be re-encoded, since it could carry the location", async () => {
    vi.stubGlobal("createImageBitmap", vi.fn().mockRejectedValue(new Error("no decoder")));
    serveStories();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { container } = renderStories();
    await screen.findByRole("button", { name: "Ver as stories de Ana" });

    await userEvent.upload(fileInput(container), photo());

    expect(await screen.findByText("Não deu para preparar esta imagem. Tenta outra foto.")).toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("refuses a file that is not a story image without sending anything", async () => {
    serveStories();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { container } = renderStories();
    await screen.findByRole("button", { name: "Ver as stories de Ana" });

    await userEvent.upload(fileInput(container), photo("animacao.gif", "image/gif"), { applyAccept: false });

    expect(await screen.findByText("Escolhe uma imagem JPEG, PNG ou WebP.")).toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("refuses a file that is not an image at all", async () => {
    serveStories();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { container } = renderStories();
    await screen.findByRole("button", { name: "Ver as stories de Ana" });

    await userEvent.upload(fileInput(container), new File(["%PDF"], "doc.pdf", { type: "application/pdf" }), {
      applyAccept: false,
    });

    expect(await screen.findByText("Escolhe uma imagem JPEG, PNG ou WebP.")).toBeInTheDocument();
    expect(fetchSpy.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("says the image is too large when the server answers 413", async () => {
    serveStories();
    server.use(http.post(STORIES, () => HttpResponse.json({ code: "PAYLOAD_TOO_LARGE" }, { status: 413 })));
    const { container } = renderStories();
    await screen.findByRole("button", { name: "Ver as stories de Ana" });

    await userEvent.upload(fileInput(container), photo());

    expect(await screen.findByText("A imagem é demasiado grande (máximo 4 MB).")).toBeInTheDocument();
  });

  it("tells the member when they have reached the limit of active stories", async () => {
    serveStories();
    server.use(
      http.post(STORIES, () =>
        HttpResponse.json({ code: "STORY_LIMIT_REACHED", message: "You already have the maximum." }, { status: 409 }),
      ),
    );
    const { container } = renderStories();
    await screen.findByRole("button", { name: "Ver as stories de Ana" });

    await userEvent.upload(fileInput(container), photo());

    expect(
      await screen.findByText("Já tens 10 stories ativas, o máximo. Apaga uma ou espera que uma expire."),
    ).toBeInTheDocument();
  });

  it("shows that it is publishing and blocks a second pick meanwhile", async () => {
    serveStories();
    let release: () => void = () => {};
    server.use(
      http.post(STORIES, async () => {
        await new Promise<void>((resolve) => (release = resolve));
        return HttpResponse.json({ id: "new", createdAtUtc: "", expiresAtUtc: "" }, { status: 201 });
      }),
    );
    const { container } = renderStories();
    await screen.findByRole("button", { name: "Ver as stories de Ana" });

    await userEvent.upload(fileInput(container), photo());

    expect(await screen.findByText("A publicar...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publicar uma story" })).toBeDisabled();
    release();
    expect(await screen.findByText("Story publicada. Desaparece daqui a 24 horas.")).toBeInTheDocument();
  });
});

describe("without an active event", () => {
  it("shows nothing", async () => {
    server.use(apiRoute("get", "events/active/context", null));
    const { queryClient } = renderWithProviders(<StoriesModule />);

    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(screen.queryByRole("region", { name: "Stories" })).not.toBeInTheDocument();
  });
});
