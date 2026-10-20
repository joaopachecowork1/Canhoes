import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/*
 * The main flows in a real browser, signed in with the development login on a seeded database.
 * The mobile viewport is the one the app is designed for.
 */

async function signIn(page: Page) {
  await page.goto("/canhoes/login");
  await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 60_000 });
  await expect(page.getByRole("heading", { level: 1, name: "Mural" })).toBeAttached();
}

test.beforeEach(async ({ page }) => signIn(page));

test("shows the mural with the group's cromos and the post numbers", async ({ page }) => {
  await expect(page.getByRole("list", { name: "Membros" })).toBeVisible();
  await expect(page.getByText(/^Nº \d+$/).first()).toBeVisible();
});

test("keeps the admin menu button of a post inside its card on a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/canhoes");
  const card = page.locator('[data-slot="card"]', { hasText: /Nº \d+/ }).first();
  const cardBox = await card.boundingBox();

  for (const button of await card.getByRole("button", { name: "Opções da publicação" }).all()) {
    const box = await button.boundingBox();
    expect(box && cardBox && box.x + box.width <= cardBox.x + cardBox.width + 1).toBe(true);
  }
});

test("publishes a post that then shows at the top of the mural", async ({ page }) => {
  const text = `Post de teste ${Date.now()}`;

  await page.getByRole("button", { name: "Cola aqui a tua publicação" }).click();
  await page.getByRole("textbox").first().fill(text);
  await page.getByRole("button", { name: /^Publicar/ }).click();

  await expect(page.getByText(text)).toBeVisible();
});

test("changes the person's colour from the menu and keeps it after a reload", async ({ page }) => {
  await page.getByRole("button", { name: "Abrir mais opções" }).click();
  // The radio is visually hidden; its swatch is the label around it.
  // The swatch looks picked as soon as it is tapped; reloading before the save lands would read the old colour.
  const saved = page.waitForResponse((response) => response.url().endsWith("/v1/me/color") && response.ok());
  await page.locator("label", { has: page.getByRole("radio", { name: "Rosa" }) }).click();
  await saved;
  await expect(page.getByRole("radio", { name: "Rosa" })).toBeChecked();

  await page.reload();
  await page.getByRole("button", { name: "Abrir mais opções" }).click();
  await expect(page.getByRole("radio", { name: "Rosa" })).toBeChecked();
});

test("votes in the official ballot once the voting phase is open", async ({ page }) => {
  const { event } = await (await page.request.get("/api/v1/events/active/context")).json();
  await page.request.put(`/api/v1/events/${event.id}/admin/phase`, { data: { phaseType: "VOTING" } });
  try {
    await page.goto("/canhoes/votacao");

    const option = page.locator("button[aria-pressed]").first();
    await option.click();

    await expect(option).toHaveAttribute("aria-pressed", "true");
  } finally {
    // Even when the vote fails, the next tests (and the next run) must not start in the voting phase.
    await page.request.put(`/api/v1/events/${event.id}/admin/phase`, { data: { phaseType: "PROPOSALS" } });
  }
});

for (const path of ["/canhoes", "/canhoes/votacao", "/canhoes/wishlist", "/canhoes/admin/configuracoes"]) {
  test(`has no serious accessibility problems on ${path}`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();

    expect(violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical")).toEqual([]);
  });
}
