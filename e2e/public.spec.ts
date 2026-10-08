import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { noOverflow, waitLoaderGone, watch } from "./helpers";

const ROUTES = ["/", "/games", "/games/skills", "/games/popular", "/games/publish", "/games/money", "/courses", "/showcase/gallery", "/showcase/achievements", "/showcase/challenges", "/about/story", "/about/method", "/about/partnership", "/about/contact", "/login", "/signup"];

for (const path of ROUTES) {
  test(`public page ${path}: loads clean, RTL, no overflow, one h1`, async ({ page }) => {
    const problems = watch(page);
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await waitLoaderGone(page);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "fa");
    await expect(page.locator("h1")).toHaveCount(1);
    await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); } window.scrollTo(0, 0); });
    await page.waitForTimeout(300);
    await noOverflow(page);
    expect(problems, problems.join("\n")).toEqual([]);
  });
}

test("404 page is a real 404 with a way back", async ({ page }) => {
  const res = await page.goto("/nope/never");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("link", { name: "بازگشت به صفحه اصلی" })).toBeVisible();
});

test("skip link and keyboard focus are visible", async ({ page, isMobile }) => {
  test.skip(!!isMobile);
  await page.goto("/games");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "پریدن به محتوای اصلی" });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
});

for (const path of ["/", "/games", "/courses", "/about/contact", "/login"]) {
  test(`a11y (axe, serious+critical) ${path}`, async ({ page }) => {
    await page.goto(path); await waitLoaderGone(page);
    const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).disableRules(["color-contrast"]).analyze();
    const bad = r.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
    expect(bad.map((v) => `${v.id}: ${v.nodes.slice(0, 2).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
}
