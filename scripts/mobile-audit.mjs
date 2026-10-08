// Dev tool: strict phone UX audit across pages × widths (tap targets, font sizes, iOS input zoom, clipping, oversize type).
// usage: BASE=http://localhost:3001 node scripts/mobile-audit.mjs [widths=320,360,390,430] [only]
import { chromium } from "@playwright/test";
const BASE = process.env.BASE ?? "http://localhost:3001";
const widths = (process.argv[2] ?? "320,360,390,430").split(",").map(Number);
const only = process.argv[3];
const PUBLIC = ["/games", "/games/skills", "/games/publish", "/courses", "/showcase/gallery", "/showcase/achievements", "/showcase/challenges", "/about/story", "/about/method", "/about/partnership", "/about/contact", "/login", "/signup"];
const PANELS = { student: ["", "/missions", "/arcade", "/toolbox", "/projects", "/ranking", "/notifications", "/settings"], coach: ["", "/classes", "/attendance", "/evaluations", "/challenges", "/reports"], parent: ["", "/skills", "/projects", "/reports"], admin: ["", "/inbox", "/content", "/content/edit?key=home", "/courses", "/missions", "/games", "/badges", "/challenges", "/toolbox", "/projects", "/comments", "/classes", "/users", "/audit", "/settings"] };
const browser = await chromium.launch();
const probe = () => {
  const vw = innerWidth, out = [];
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return false; for (let n = e; n && n !== document.body; n = n.parentElement) { const cs = getComputedStyle(n); if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return false; } return true; };
  const name = (e) => `${e.tagName.toLowerCase()}${e.className && typeof e.className === "string" ? "." + e.className.split(" ")[0] : ""}«${(e.textContent || e.getAttribute("aria-label") || e.placeholder || "").trim().slice(0, 18)}»`;
  const scope = [...document.querySelectorAll("body *")].filter((e) => !e.closest(".nav,.sheet,.rail,.hud,.stickycta,.particles,.skip,nextjs-portal,script,style"));
  // tap targets
  document.querySelectorAll("a[href],button,select,summary,input:not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea,[role=button],[role=tab]").forEach((e) => {
    if (e.closest(".nav,.sheet,.rail,.hud,.stickycta,nextjs-portal") || !vis(e)) return;
    const r = e.getBoundingClientRect();
    const inline = e.tagName === "A" && getComputedStyle(e).display === "inline" && e.closest("p,li,dd,span:not(.btn__label),small,em");
    const bad = inline ? false : Math.min(r.width, r.height) < 36 || r.height < 36;
    if (bad) out.push(["tap<36", name(e), `${Math.round(r.width)}x${Math.round(r.height)}`]);
    if (r.right > vw + 1 || r.left < -1) out.push(["offscreen", name(e), `L${Math.round(r.left)} R${Math.round(r.right)}`]);
  });
  document.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]),select,textarea").forEach((e) => { if (vis(e) && parseFloat(getComputedStyle(e).fontSize) < 16) out.push(["input<16px(iOS zoom)", name(e), getComputedStyle(e).fontSize]); });
  // fonts
  const seen = new Set();
  scope.forEach((e) => {
    if (!vis(e)) return;
    const own = [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own) return;
    const fs = parseFloat(getComputedStyle(e).fontSize);
    const k = e.className + fs; if (fs < 11.5 && !seen.has(k)) { seen.add(k); out.push(["font<11.5", name(e), fs + "px"]); }
    if (/^H1$/.test(e.tagName) && fs > 40) out.push(["h1>40px", name(e), fs + "px"]);
    if (/^H2$/.test(e.tagName) && fs > 34) out.push(["h2>34px", name(e), fs + "px"]);
    if (/^H3$/.test(e.tagName) && fs > 24) out.push(["h3>24px", name(e), fs + "px"]);
    if (!/^H[1-6]$/.test(e.tagName) && fs > 22 && !e.closest("h1,h2,h3,.stat,.num,.big,.kpi")) { if (!seen.has("big" + k)) { seen.add("big" + k); out.push(["text>22px", name(e), fs + "px"]); } }
  });
  // clipped / truncated
  scope.forEach((e) => { if (!vis(e)) return; const cs = getComputedStyle(e); if ((cs.overflow === "hidden" || cs.textOverflow === "ellipsis") && e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0 && !e.closest(".cabs,.track,.cam,.backdrop,.stage,.float,.tablewrap,.phero__bg,.gate,.portal,.pin-spacer")) out.push(["clipped-x", name(e), `${e.scrollWidth}>${e.clientWidth}`]); });
  // wide tables / pre / images not shrinking
  scope.forEach((e) => { if (!vis(e) || e.closest(".tablewrap,.cabs,.track,.cam,.backdrop,.stage,.float,.chips-row,.phero__bg,.pin-spacer")) return; const r = e.getBoundingClientRect(); if (r.width > vw + 2 && getComputedStyle(e).position !== "fixed") out.push(["wider-than-viewport", name(e), Math.round(r.width) + ""]); });
  return out;
};
const agg = new Map();
async function audit(ctx, path, w) {
  const page = await ctx.newPage();
  await page.goto(BASE + path, { waitUntil: "networkidle" }).catch(() => {});
  await page.waitForTimeout(500);
  const issues = await page.evaluate(probe);
  for (const [k, n, d] of issues) { const key = `${k}|${n}`; const e = agg.get(key) ?? { k, n, pages: new Set(), ws: new Set(), d }; e.pages.add(path); e.ws.add(w); agg.set(key, e); }
  await page.close();
}
for (const w of widths) {
  const mk = (i) => browser.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true, locale: "fa-IR", extraHTTPHeaders: { "x-forwarded-for": `10.66.${i}.${w % 250}` } });
  let ctx = await mk(1);
  for (const p of PUBLIC) { if (only && !p.includes(only)) continue; await audit(ctx, p, w); }
  await ctx.close();
  for (const [i, [role, subs]] of Object.entries(PANELS).map((e, i) => [i, e])) {
    if (only && !role.includes(only)) continue;
    const c = await mk(10 + +i); const page = await c.newPage();
    await page.goto(BASE + "/login", { waitUntil: "networkidle" });
    await page.getByLabel("ایمیل یا شماره موبایل").fill(`${role}@demo.konjed`); await page.getByLabel("رمز عبور").fill("demo12345");
    await page.getByRole("button", { name: "ورود", exact: true }).click(); await page.waitForURL(/\/panel\//); await page.close();
    for (const s of subs) await audit(c, `/panel/${role}${s}`, w);
    await c.close();
  }
}
const rows = [...agg.values()].sort((a, b) => a.k.localeCompare(b.k) || b.pages.size - a.pages.size);
let last = "";
for (const r of rows) { if (r.k !== last) { console.log(`\n## ${r.k}`); last = r.k; } console.log(`  ${r.n}  [${r.d}]  ${r.pages.size}p @${[...r.ws].join("/")}  e.g. ${[...r.pages].slice(0, 2).join(" ")}`); }
console.log(`\nTOTAL distinct: ${rows.length}`);
await browser.close();
