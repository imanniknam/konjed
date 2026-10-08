import { expect, test } from "@playwright/test";
import { watch } from "./helpers";

/**
 * The homepage is one pinned, scrubbed story on every viewport (desktop = cinematic, phones = mobile).
 * These checks walk it and assert the composition rules: the card in focus stays inside the frame,
 * and copy never shares space with a card.
 */
test("homepage story: pinned on every viewport, cards stay in frame, copy never collides", async ({ page }) => {
  const problems = watch(page);
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.documentElement.dataset.ready === "true", null, { timeout: 20_000 });
  const mode = await page.evaluate(() => document.documentElement.dataset.mode);
  const { width: W, height: H } = page.viewportSize()!;
  expect(mode).toBe(W >= 900 ? "cinematic" : "mobile");

  const ranges = await page.evaluate(() => ["arcade", "school", "showcase", "journey"].map((id) => {
    const el = document.querySelector(`[data-scene="${id}"]`)!;
    const sp = el.closest(".pin-spacer") as HTMLElement | null;
    const top = (sp ?? (el as HTMLElement)).getBoundingClientRect().top + scrollY;
    return { id, top, len: (sp?.offsetHeight ?? 0) - innerHeight };
  }));
  expect(ranges.every((r) => r.len > H * 1.2), "every scene is a pinned, multi-screen scene").toBe(true);

  const bad: string[] = [];
  const probe = () => page.evaluate(() => {
    const vw = innerWidth, vh = innerHeight, out: string[] = [];
    const vis = (el: Element) => { for (let e: Element | null = el; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.visibility === "hidden" || cs.display === "none" || +cs.opacity < 0.5) return false; } return true; };
    const rect = (el: Element) => el.getBoundingClientRect();
    const hit = (a: DOMRect, b: DOMRect) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 10 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 10;
    const inFrame = (r: DOMRect) => r.left >= -2 && r.right <= vw + 2 && r.top >= 0 && r.bottom <= vh + 2;
    document.querySelectorAll<HTMLElement>('.cab[data-active="true"], .pcard[data-active="true"]').forEach((c) => {
      if (!vis(c)) return;
      const r = rect(c);
      if (!inFrame(r)) out.push(`${c.className.split(" ")[0]} out of frame ${Math.round(r.left)}..${Math.round(r.right)} / ${Math.round(r.top)}..${Math.round(r.bottom)} in ${vw}x${vh}`);
      document.querySelectorAll(".head, .dots, .showcase__cta, .course").forEach((h) => { if (vis(h) && !h.contains(c) && hit(r, rect(h))) out.push(`${c.className.split(" ")[0]} overlaps ${h.className.split(" ")[0]}`); });
    });
    const course = document.querySelector(".course"), head = document.querySelector(".head--school");
    if (course && head && vis(course) && vis(head) && hit(rect(course), rect(head))) out.push("course overlaps school head");
    return out;
  });

  for (const r of ranges) {
    for (const p of [0.12, 0.3, 0.45, 0.6, 0.75, 0.9]) {
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(r.top + r.len * p));
      await page.waitForTimeout(1200);
      for (const m of await probe()) bad.push(`${r.id}@${p}: ${m}`);
    }
  }
  expect(bad, "composition problems").toEqual([]);
  expect(problems).toEqual([]);
});
