import { isValidElement, type ReactElement, type ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { canhoesServerFetch } from "@/lib/api/canhoesServerClient";
import { makeEventContext } from "@/tests/component/eventContext";

import AdminIndexPage from "./admin/page";
import AdminSectionPage from "./admin/[section]/page";
import SecretSantaPage from "./amigo-secreto/page";
import CategoriesPage from "./categorias/page";
import FeedRedirectPage from "./feed/page";
import GalaPage from "./gala/page";
import MeasuresPage from "./medidas/page";
import NominationsPage from "./nomeacoes/page";
import HomePage from "./page";
import StickersPage from "./stickers/page";
import VotingPage from "./votacao/page";
import WishlistPage from "./wishlist/page";

/*
 * Each page is a server component that loads the first data on the server and hands it to its
 * module. These tests call the page with a fake server fetch and read the props it passes on.
 */

vi.mock("@/lib/api/canhoesServerClient", () => ({ canhoesServerFetch: vi.fn() }));

const context = makeEventContext();
const fetchMock = vi.mocked(canhoesServerFetch);

/** Every path answers `{ from: path }`, the active context answers the event (or null). */
function serveEverything(activeContext: unknown = context) {
  fetchMock.mockImplementation(async (path: string) => (path === "events/active/context" ? activeContext : { items: [`items of ${path}`], from: path }));
}

type AnyProps = Record<string, unknown> & { children?: ReactNode };

/** The first element in the tree that receives `prop`. */
function findElementWithProp(node: ReactNode, prop: string): ReactElement<AnyProps> | null {
  if (!isValidElement<AnyProps>(node)) return null;
  if (prop in node.props) return node;
  const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
  for (const child of children) {
    const found = findElementWithProp(child, prop);
    if (found) return found;
  }
  return null;
}

const fetchedPaths = () => fetchMock.mock.calls.map(([path]) => path);

describe("app pages", () => {
  beforeEach(() => fetchMock.mockReset());

  it.each([
    ["votação", VotingPage, "initialData", "events/event-1/voting"],
    ["medidas", MeasuresPage, "initialData", "events/event-1/measures"],
    ["gala", GalaPage, "initialResults", "events/event-1/results"],
    ["categorias", CategoriesPage, "initialCategories", "events/event-1/categories?skip=0&take=50"],
    ["nomeações", NominationsPage, "initialCategories", "events/event-1/categories?skip=0&take=50"],
  ])("%s loads its data and the context for the module", async (_name, Page, dataProp, path) => {
    serveEverything();

    const moduleElement = findElementWithProp(await Page(), "initialContext");

    expect(moduleElement?.props.initialContext).toBe(context);
    expect(moduleElement?.props[dataProp]).toBeDefined();
    expect(fetchedPaths()).toContain(path);
  });

  it.each([
    ["votação", VotingPage],
    ["medidas", MeasuresPage],
    ["gala", GalaPage],
    ["categorias", CategoriesPage],
    ["nomeações", NominationsPage],
    ["amigo secreto", SecretSantaPage],
    ["stickers", StickersPage],
    ["wishlist", WishlistPage],
    ["mural", HomePage],
  ])("%s renders without an active event", async (_name, Page) => {
    serveEverything(null);

    const moduleElement = findElementWithProp(await Page(), "initialContext");

    expect(moduleElement?.props.initialContext).toBeUndefined();
    expect(fetchedPaths()).toEqual(["events/active/context"]);
  });

  it("amigo secreto loads the overview and the wishlist", async () => {
    serveEverything();
    const moduleElement = findElementWithProp(await SecretSantaPage(), "initialSecretSantaOverview");

    expect(moduleElement?.props.initialSecretSantaOverview).toMatchObject({ from: "events/event-1/secret-santa/overview" });
    expect(moduleElement?.props.initialWishlistData).toMatchObject({ from: "events/event-1/wishlist?skip=0&take=1000" });
  });

  it("stickers load the categories and the approved stickers", async () => {
    serveEverything();
    const moduleElement = findElementWithProp(await StickersPage(), "initialStickerCategories");

    expect(moduleElement?.props.initialStickerCategories).toEqual(["items of events/event-1/categories?skip=0&take=50"]);
    expect(moduleElement?.props.initialApprovedNominees).toMatchObject({ from: "events/event-1/nominations/approved" });
  });

  it("wishlist loads the members and every item", async () => {
    serveEverything();
    const moduleElement = findElementWithProp(await WishlistPage(), "initialMembers");

    expect(moduleElement?.props.initialMembers).toMatchObject({ from: "events/event-1/members" });
    expect(moduleElement?.props.initialWishlistItems).toEqual(["items of events/event-1/wishlist?skip=0&take=1000"]);
  });

  it("the mural loads the first page of posts and the dashboard", async () => {
    serveEverything();
    fetchMock.mockImplementation(async (path: string) =>
      path === "events/active/context" ? context : { items: [], total: 0, skip: 0, take: 15, hasMore: false }
    );

    const tree = await HomePage();

    expect(findElementWithProp(tree, "context")?.props.context).toBe(context);
    expect(findElementWithProp(tree, "initialData")?.props.initialData).toMatchObject({ pageParams: [0] });
    expect(fetchedPaths()).toContain("events/event-1/feed/posts?skip=0&take=15");
  });

  it("admin opens the requested section and rejects unknown ones", async () => {
    serveEverything();

    const moduleElement = findElementWithProp(await AdminSectionPage({ params: Promise.resolve({ section: "membros" }) }), "section");
    expect(moduleElement?.props).toMatchObject({ section: "membros", initialEventId: "event-1" });

    await AdminSectionPage({ params: Promise.resolve({ section: "nada" }) });
    expect(notFound).toHaveBeenCalled();
  });

  it("old addresses redirect", () => {
    AdminIndexPage();
    FeedRedirectPage();
    expect(redirect).toHaveBeenCalledWith("/canhoes/admin/conteudo");
    expect(redirect).toHaveBeenCalledWith("/canhoes");
  });
});
