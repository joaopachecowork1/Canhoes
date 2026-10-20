import { vi, type Mock } from "vitest";

/** What `next/navigation` returns in component tests; reset after each test (see setup.ts). */
export const router: Record<"push" | "replace" | "back" | "forward" | "refresh" | "prefetch", Mock> = {
  push: vi.fn(),
  replace: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
  prefetch: vi.fn(),
};
export const navigation = { pathname: "/canhoes", searchParams: new URLSearchParams() };

export function setNavigation({ pathname = "/canhoes", search = "" }: { pathname?: string; search?: string } = {}) {
  navigation.pathname = pathname;
  navigation.searchParams = new URLSearchParams(search);
}

export function resetNavigation() {
  setNavigation();
  Object.values(router).forEach((spy) => spy.mockReset());
}
