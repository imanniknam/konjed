// Dev tool: full-page phone screenshots of public pages + role panels, sliced into viewport-height tiles.
// usage: BASE=http://localhost:3001 node scripts/mobile-shots.mjs [WxH] [only-substring]
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
const BASE = process.env.BASE ?? "http://localhost:3001";
const [W, H] = (process.argv[2] ?? "390x844").split("x").map(Number);
const only = process.argv[3];
mkdirSync(".audit", { recursive: true });
const PUBLIC = ["/games", "/games/skills", "/games/popular", "/games/publish", "/games/money", "/courses", "/showcase/gallery", "/showcase/achievements", "/showcase/challenges", "/about/story", "/about/method", "/about/partnership", "/about/contact", "/login", "/signup", "/nope"];
const PANELS = { student: ["", "/missions", "/arcade", "/toolbox", "/projects", "/ranking", "/notifications", "/settings"], coach: ["", "/classes", "/attendance", "/evaluations", "/challenges", "/reports"], parent: ["", "/skills", "/projects", "/reports"], admin: ["", "/inbox", "/content", "/content/edit?key=home", "/courses", "/missions", "/games", "/badges", "/challenges", "/toolbox", "/projects", "/comments", "/classes", "/users", "/audit", "/settings"] };
const browser = await chromium.launch();
async function shoot(ctx, path, name) {
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(700);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  await page.screenshot({ path: `.audit/m-${name}.png`, fullPage: true });
  console.log(name.padEnd(34), "scrollWidth", sw, sw > W ? "  ← OVERFLOW" : "");
  await page.close();
}
const mk = (n) => browser.newContext({ viewport: { width: W, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, locale: "fa-IR", extraHTTPHeaders: { "x-forwarded-for": `10.77.${n}.${W % 250}` } });
let ctx = await mk(1);
for (const p of PUBLIC) { if (only && !p.includes(only)) continue; await shoot(ctx, p, "pub" + p.replace(/\//g, "_")); }
await ctx.close();
for (const [i, [role, subs]] of Object.entries(PANELS).map((e, i) => [i, e])) {
  if (only && !role.includes(only)) continue;
  const c = await mk(10 + +i); const page = await c.newPage();
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.getByLabel("ایمیل یا شماره موبایل").fill(`${role}@demo.konjed`); await page.getByLabel("رمز عبور").fill("demo12345");
  await page.getByRole("button", { name: "ورود", exact: true }).click(); await page.waitForURL(/\/panel\//); await page.close();
  for (const s of subs) await shoot(c, `/panel/${role}${s}`, `panel-${role}${s.replace(/[\/?=]/g, "_")}`);
  await c.close();
}
await browser.close();
