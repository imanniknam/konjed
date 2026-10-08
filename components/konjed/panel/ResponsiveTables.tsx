"use client";

import { useEffect } from "react";

/**
 * Phones: data tables turn into stacked cards (CSS, `.ptable` ≤ 640px). Each cell needs its column title,
 * so this copies the header text into `data-label` — now and whenever a table is (re)rendered.
 */
export function ResponsiveTables() {
  useEffect(() => {
    const label = () => document.querySelectorAll<HTMLTableElement>("table.ptable").forEach((t) => {
      const heads = [...t.querySelectorAll("thead th")].map((h) => h.textContent?.trim() ?? "");
      t.querySelectorAll("tbody tr").forEach((tr) => [...tr.children].forEach((td, i) => { if (td.getAttribute("data-label") !== (heads[i] ?? "")) td.setAttribute("data-label", heads[i] ?? ""); }));
    });
    label();
    // keep the active section visible in the horizontal panel menus
    document.querySelectorAll<HTMLElement>(".panel__side nav [aria-current], .adm-nav [aria-current]").forEach((a) => a.scrollIntoView({ inline: "center", block: "nearest" }));
    let raf = 0;
    const mo = new MutationObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(label); });
    mo.observe(document.querySelector("main") ?? document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); cancelAnimationFrame(raf); };
  }, []);
  return null;
}
