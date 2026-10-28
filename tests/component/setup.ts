import "./polyfills";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { toast } from "sonner";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";

import { resetNavigation } from "./navigation";
import { server } from "./server";
import { resetSession } from "./session";

// The App Router and NextAuth need a running Next.js app; tests drive these doubles instead.
vi.mock("next/navigation", async () => {
  const { navigation, router } = await import("./navigation");
  return {
    useRouter: () => router,
    usePathname: () => navigation.pathname,
    useSearchParams: () => navigation.searchParams,
    redirect: vi.fn(),
    notFound: vi.fn(),
  };
});
vi.mock("next-auth/react", async () => {
  const session = await import("./session");
  return {
    useSession: () => ({ ...session.sessionState, update: session.updateSession }),
    signIn: session.signIn,
    signOut: session.signOut,
    SessionProvider: ({ children }: { children: unknown }) => children,
  };
});

beforeEach(() => {
  resetNavigation();
  resetSession();
});

// Fake API: a request without a handler fails the test instead of reaching the network.
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  // Vitest runs without globals, so Testing Library cannot register its own cleanup.
  cleanup();
  server.resetHandlers();
  // Toasts live in a module-level store; without this one test's toast shows up in the next.
  toast.dismiss();
  // Radix dialogs lock the body with pointer-events: none; one unmounted mid-animation leaves it set.
  document.body.style.pointerEvents = "";
});
afterAll(() => server.close());

// jsdom has no matchMedia; components that check prefers-reduced-motion get "no preference".
if (!globalThis.matchMedia) {
  globalThis.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom does no layout, so scrolling is a no-op.
Element.prototype.scrollTo ??= () => {};
Element.prototype.scrollIntoView ??= () => {};

// jsdom has no IntersectionObserver; infinite scroll then waits for the "load more" button.
globalThis.IntersectionObserver ??= class {
  readonly root = null;
  readonly rootMargin = "";
  readonly thresholds = [];
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
} as unknown as typeof IntersectionObserver;

// jsdom has no object URLs; previews get a stable fake one.
let objectUrlCount = 0;
URL.createObjectURL ??= () => `blob:test/${++objectUrlCount}`;
URL.revokeObjectURL ??= () => {};
