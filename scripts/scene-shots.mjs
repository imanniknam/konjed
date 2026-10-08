// Dev tool: screenshots each scene at N evenly spaced progress points. usage: node scripts/scene-shots.mjs 1440x900 [N]
import { chromium } from "@playwright/test";
const BASE = process.env.BASE ?? "http://localhost:3000";
const [W, H] = (process.argv[2] ?? "1440x900").split("x").map(Number);
const N = Number(process.argv[3] ?? 6);
const only = process.argv[4]; // optional scene id
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: W < 900, hasTouch: W < 900, deviceScaleFactor: W < 900 ? 2 : 1, locale: "fa-IR", extraHTTPHeaders: { "x-forwarded-for": `10.8.${W % 250}.${H % 250}` } });
const page = await ctx.newPage();
await page.goto(BASE + "/", { waitUntil: "networkidle" });
await page.waitForFunction(() => document.documentElement.dataset.ready === "true", null, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(800);
const ranges = await page.evaluate(() => ["hero", "arcade", "school", "showcase", "journey", "final"].map((id) => {
  const el = document.querySelector(`[data-scene="${id}"]`); const sp = el.closest(".pin-spacer") ?? el;
  const top = sp.getBoundingClientRect().top + scrollY; return { id, top, len: Math.min(sp.offsetHeight - innerHeight, 99999) };
}));
ranges.forEach((r, i) => { if (ranges[i + 1]) r.len = Math.min(r.len, ranges[i + 1].top - r.top); });
for (const r of ranges) {
  if (only && r.id !== only) continue;
  for (let i = 0; i <= N; i++) {
    const y = Math.round(r.top + (r.len * i) / N);
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(1300);
    await page.screenshot({ path: `.audit/s-${W}x${H}-${r.id}-${i}.png` });
  }
}
console.log(JSON.stringify(ranges));
await browser.close();
