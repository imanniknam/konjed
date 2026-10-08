import { chromium, devices } from "@playwright/test";
const BASE = process.env.BASE ?? "https://konjed.top";
const b = await chromium.launch();
for (const [name, opts] of [["desktop", { viewport: { width: 1440, height: 900 } }], ["mobile", { ...devices["Pixel 7"] }]]) {
  const c = await b.newContext({ ...opts, extraHTTPHeaders: { "x-forwarded-for": "10.4.4." + (name === "mobile" ? 2 : 1) } });
  const p = await c.newPage();
  const reqs = [];
  p.on("response", async (r) => { try { const h = r.headers(); reqs.push({ url: r.url().replace(BASE, ""), type: r.request().resourceType(), status: r.status(), len: +(h["content-length"] ?? 0), enc: h["content-encoding"] ?? "", cc: h["cache-control"] ?? "" }); } catch {} });
  const t0 = Date.now();
  await p.goto(BASE + "/", { waitUntil: "load", timeout: 90000 });
  const loadMs = Date.now() - t0;
  const nav = await p.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) }; });
  const lcp = await p.evaluate(() => new Promise((res) => { let v = 0; new PerformanceObserver((l) => { for (const e of l.getEntries()) v = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true }); setTimeout(() => res(Math.round(v)), 300); }));
  const ready = await p.evaluate(() => document.documentElement.dataset.ready);
  await p.waitForTimeout(2500);
  const total = reqs.reduce((a, r) => a + r.len, 0);
  const by = {}; for (const r of reqs) { by[r.type] = by[r.type] || { n: 0, kb: 0 }; by[r.type].n++; by[r.type].kb += r.len / 1024; }
  console.log(`\n=== ${name}  load=${loadMs}ms`, JSON.stringify(nav), "LCP", lcp, "ready", ready, `reqs=${reqs.length} ~${(total / 1024).toFixed(0)}KB(content-length known)`);
  console.log(Object.entries(by).map(([k, v]) => `${k}:${v.n}/${v.kb.toFixed(0)}KB`).join("  "));
  reqs.sort((a, b) => b.len - a.len).slice(0, 12).forEach((r) => console.log(`  ${(r.len / 1024).toFixed(0).padStart(6)}KB ${r.type.padEnd(8)} ${r.enc.padEnd(5)} ${r.url.slice(0, 80)}  [${r.cc.slice(0, 30)}]`));
  const noEnc = reqs.filter((r) => ["document", "script", "stylesheet", "fetch"].includes(r.type) && !r.enc).length;
  console.log("  uncompressed text resources:", noEnc);
  await c.close();
}
await b.close();
