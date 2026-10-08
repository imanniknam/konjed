import { expect, type Page } from "@playwright/test";

export const rnd = () => Math.random().toString(36).slice(2, 8);

/** Collects console errors, failed requests and 4xx/5xx responses (except expected API 4xx). */
export function watch(page: Page) {
  const problems: string[] = [];
  page.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource.*(401|403|404|409|422)/.test(m.text())) problems.push(`console: ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on("requestfailed", (r) => { if (!/_next\/webpack-hmr|favicon/.test(r.url()) && r.failure()?.errorText !== "net::ERR_ABORTED") problems.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`); });
  page.on("response", (r) => { if (r.status() >= 500 || (r.status() === 404 && /\.(png|webp|jpg|svg|woff2?|js|css)(\?|$)/.test(r.url()))) problems.push(`http ${r.status()}: ${r.url()}`); });
  return problems;
}

export async function noOverflow(page: Page) {
  const bad = await page.evaluate(() => {
    const W = innerWidth; const out: string[] = [];
    const cine = ["cinematic", "mobile"].includes(document.documentElement.dataset.mode ?? "");
    const skip = (e: Element) => (cine && !!e.closest(".scene .stage")) || !!e.closest(".cabs,.track,.cam,.backdrop,.float,.phero__bg,.footer__rock,.particles,.gate,.portal,.final__cloud,.loader,.sheet,.tablewrap,.panel__side nav ul,.adm-nav,dialog:not([open]),.chips-row.scroll");
    document.querySelectorAll("body *").forEach((e) => {
      if (skip(e)) return; const cs = getComputedStyle(e);
      if (cs.position === "fixed" || cs.display === "none" || cs.visibility === "hidden") return;
      const r = e.getBoundingClientRect(); if (!r.width) return;
      if (r.right > W + 2 || r.left < -2) out.push(`${e.tagName}.${String(e.className).split(" ")[0]} L${Math.round(r.left)} R${Math.round(r.right)}`);
    });
    return { out: out.slice(0, 6), sw: document.documentElement.scrollWidth, W };
  });
  expect(bad.out, `horizontal overflow @${bad.W}px`).toEqual([]);
  expect(bad.sw).toBeLessThanOrEqual(bad.W + 1);
}

export async function login(page: Page, email: string, password = "demo12345") {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("ایمیل یا شماره موبایل").fill(email);
  await page.getByLabel("رمز عبور").fill(password);
  await page.getByRole("button", { name: "ورود", exact: true }).click();
  await page.waitForURL(/\/panel\//);
}

export async function waitLoaderGone(page: Page) {
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true" || !document.querySelector(".loader"), null, { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(400);
}
