// Dev tool: scrolls the cinematic home page and reports cards/text that leave the viewport or collide.
// usage: node scripts/scene-audit.mjs [WxH,WxH...] [--shots]
import { chromium } from "@playwright/test";
const BASE = process.env.BASE ?? "http://localhost:3000";
const arg = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : "1920x1080,1440x900,1366x768,1280x720,1024x768";
const shots = process.argv.includes("--shots");
const sizes = arg.split(",").map((s) => s.split("x").map(Number));
const STEP = Number(process.env.STEP ?? 0.25); // fraction of viewport height per step

const SEL = {
  card: ".cab, .pcard, .course, .peek, .step, .hero__content, .final__content, .head, .ribbon, .showcase__cta",
  text: "h1,h2,h3,p,.btn,.cab__text,.course__meta,.pcard__maker,.pcard__blurb,.ribbon,.dots button",
};

const browser = await chromium.launch();
let total = 0;
for (const [W, H] of sizes) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, isMobile: W < 900, hasTouch: W < 900, locale: "fa-IR", extraHTTPHeaders: { "x-forwarded-for": `10.9.${W % 250}.${H % 250}` } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true", null, { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  const mode = await page.evaluate(() => document.documentElement.dataset.mode);
  const maxY = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const issues = new Map();
  let shotN = 0;
  for (let y = 0; y <= maxY; y += Math.round(H * STEP)) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(1100);
    const found = await page.evaluate(({ SEL }) => {
      const out = [];
      const vw = innerWidth, vh = innerHeight;
      const vis = (el) => {
        let e = el;
        while (e && e !== document.body) {
          const cs = getComputedStyle(e);
          if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.6) return false;
          e = e.parentElement;
        }
        return true;
      };
      const name = (e) => `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0] || ""}${e.dataset?.cab != null ? "[cab " + e.dataset.cab + "]" : ""}`;
      // only elements that are really painted on top (not buried under a later pinned scene / off in a clipped corner)
      const painted = (el) => {
        const r = el.getBoundingClientRect();
        const pts = [[0.5, 0.5], [0.25, 0.25], [0.75, 0.75]].map(([fx, fy]) => [Math.min(vw - 2, Math.max(2, r.left + r.width * fx)), Math.min(vh - 2, Math.max(2, r.top + r.height * fy))]);
        const sc = el.closest(".scene");
        return pts.some(([x, y]) => { const t = document.elementFromPoint(x, y); return t && (el.contains(t) || t.contains(el) || (sc && t.closest(".scene") === sc && !t.closest(".backdrop,.gate,.portal,.stage") )); });
      };
      const cards = [...document.querySelectorAll(SEL.card)].filter(vis).filter(painted);
      for (const c of cards) {
        const r = c.getBoundingClientRect();
        if (r.width < 4) continue;
        const clipL = r.left < -6, clipR = r.right > vw + 6, clipT = r.top < -6 && r.bottom > 40, clipB = r.bottom > vh + 6 && r.top < vh - 40;
        if (clipL || clipR || clipB || clipT) out.push({ kind: "off-screen", a: name(c), d: `L${Math.round(r.left)} R${Math.round(r.right)} T${Math.round(r.top)} B${Math.round(r.bottom)} vs ${vw}x${vh}` });
      }
      const texts = [...document.querySelectorAll(SEL.text)].filter(vis).filter(painted).filter((t) => t.closest(".scene") && !t.closest("nav,.hud,.rail,.stickycta,header"));
      // text overlapping a different card than the one that contains it
      for (const t of texts) {
        const tr = t.getBoundingClientRect();
        if (tr.width < 4 || tr.height < 4 || tr.bottom < 0 || tr.top > vh) continue;
        const mine = t.closest(".cab, .pcard, .course, .step, .peek, .head, .hero__content, .final__content, .journey__wrap");
        for (const c of cards) {
          if (c === mine || c.contains(t) || t.contains(c) || (mine && (mine.contains(c) || c.contains(mine)))) continue;
          const cr = c.getBoundingClientRect();
          const ox = Math.min(tr.right, cr.right) - Math.max(tr.left, cr.left), oy = Math.min(tr.bottom, cr.bottom) - Math.max(tr.top, cr.top);
          if (ox > 14 && oy > 10) out.push({ kind: "text-over-card", a: `${name(t)}«${(t.textContent || "").trim().slice(0, 24)}»`, b: name(c), d: `${Math.round(ox)}x${Math.round(oy)}` });
        }
      }
      // card/card overlaps (different semantic groups)
      for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
        const a = cards[i], b = cards[j];
        if (a.contains(b) || b.contains(a)) continue;
        if (a.matches(".cab") && b.matches(".cab")) continue;
        if (a.matches(".pcard") && b.matches(".pcard")) continue;
        const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
        const ox = Math.min(ar.right, br.right) - Math.max(ar.left, br.left), oy = Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top);
        if (ox > 24 && oy > 24) out.push({ kind: "card-overlap", a: name(a), b: name(b), d: `${Math.round(ox)}x${Math.round(oy)}` });
      }
      return out;
    }, { SEL });
    const scene = await page.evaluate(() => document.documentElement.dataset.scene);
    for (const f of found) {
      const key = `${f.kind}|${f.a}|${f.b ?? ""}`;
      if (!issues.has(key)) issues.set(key, { ...f, scene, y, n: 0 });
      issues.get(key).n++;
    }
    if (shots && found.length) { await page.screenshot({ path: `.audit/${W}x${H}-y${y}.png` }); shotN++; }
  }
  console.log(`\n=== ${W}x${H} (${mode}) maxY=${maxY} → ${issues.size} distinct issues`);
  for (const v of issues.values()) console.log(`  [${v.scene}] y=${v.y} ×${v.n}  ${v.kind}: ${v.a}${v.b ? " ↔ " + v.b : ""}  ${v.d}`);
  total += issues.size;
  await ctx.close();
}
await browser.close();
console.log(`\nTOTAL distinct issues: ${total}`);
