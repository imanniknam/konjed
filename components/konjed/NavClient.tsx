"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { panelHref, resetMe, useMe } from "@/lib/client/useMe";
import { useEffect, useRef, useState } from "react";
import { lockScroll, unlockScroll } from "@/lib/animations/registry";
import type { ChromeContent } from "@/lib/konjed/content";
import { KonjedLogo } from "./Logo";
import { KonjedButton } from "./KonjedButton";

export function NavClient({ chrome }: { chrome: ChromeContent }) {
  const { nav: NAV, auth: AUTH, cta: PRIMARY_CTA } = chrome;
  const [open, setOpen] = useState(false);
  const [openSub, setOpenSub] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const burgerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const me = useMe();
  const router = useRouter();
  const logout = async () => { await api("POST", "/api/auth/logout"); resetMe(); setOpen(false); router.push("/"); router.refresh(); };

  // mobile sheet: lock the page behind it, trap focus, close on Esc / route change / when the desktop menu returns
  useEffect(() => {
    const html = document.documentElement;
    html.classList.toggle("menu-open", open);
    if (open) lockScroll();
    else if (html.dataset.ready === "true" || !html.dataset.mode) unlockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpenSub(null); if (open) { setOpen(false); burgerRef.current?.focus(); } return; }
      if (e.key !== "Tab" || !open) return;
      const f = [...(sheetRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), summary") ?? []), burgerRef.current].filter(Boolean) as HTMLElement[];
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    const onResize = () => { if (window.innerWidth >= 1100) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    if (open) window.setTimeout(() => sheetRef.current?.querySelector<HTMLElement>("summary, a[href]")?.focus({ preventScroll: true }), 60);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize); };
  }, [open]);

  useEffect(() => { setOpen(false); setOpenSub(null); }, [pathname]);

  useEffect(() => {
    const html = document.documentElement;
    const onScroll = () => { html.dataset.scrolled = window.scrollY > 40 ? "true" : "false"; };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onDoc = (e: PointerEvent) => { if (!navRef.current?.contains(e.target as Node)) setOpenSub(null); };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, []);

  return (
    <>
    <header className="nav" ref={navRef}>
      <a href="#main" className="skip">پریدن به محتوای اصلی</a>
      <div className="nav__bar">
        <KonjedLogo />

        <nav className="nav__menu" aria-label="منوی اصلی">
          <ul>
            {NAV.map((item) => (
              <li key={item.label} className={item.children ? "has-sub" : ""} data-open={openSub === item.label}
                  onMouseEnter={() => item.children && setOpenSub(item.label)} onMouseLeave={() => setOpenSub(null)}>
                {item.children ? (
                  <>
                    <button type="button" aria-expanded={openSub === item.label} aria-haspopup="true"
                      onClick={() => setOpenSub(openSub === item.label ? null : item.label)}>
                      {item.label}<svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
                    </button>
                    <ul className="sub" role="list">
                      {item.children.map((c) => (
                        <li key={c.href}><Link href={c.href} prefetch={false} onClick={() => setOpenSub(null)}>{c.label}{c.note && <em>{c.note}</em>}</Link></li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <Link href={item.href} prefetch={false}>{item.label}</Link>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="nav__actions">
          {me ? (
            <>
              <button type="button" className="nav__logout" onClick={logout}>خروج</button>
              <KonjedButton href={panelHref(me.role)} size="sm" magnetic={false}>پنل من · {me.displayName.split(" ")[0]}</KonjedButton>
            </>
          ) : (
            <>
              <KonjedButton href={AUTH.href} variant="secondary" size="sm" magnetic={false}>{AUTH.label}</KonjedButton>
              <KonjedButton href={PRIMARY_CTA.href} size="sm" className="nav__cta">{PRIMARY_CTA.label}</KonjedButton>
            </>
          )}
        </div>

        <button type="button" ref={burgerRef} className="nav__burger" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? "بستن منو" : "باز کردن منو"} onClick={() => setOpen(!open)}>
          <span /><span /><span />
        </button>
      </div>

    </header>
    <div id="mobile-menu" ref={sheetRef} className="sheet" data-open={open} role="dialog" aria-modal="true" aria-label="منوی اصلی" aria-hidden={!open} inert={!open}>
      <ul>
        {NAV.map((item) => (
          <li key={item.label}>
            {item.children ? (
              <details>
                <summary>{item.label}</summary>
                <ul>{item.children.map((c) => <li key={c.href}><Link href={c.href} prefetch={false} onClick={() => setOpen(false)}>{c.label}{c.note && <em>{c.note}</em>}</Link></li>)}</ul>
              </details>
            ) : (
              <Link href={item.href} prefetch={false} onClick={() => setOpen(false)} className="sheet__link">{item.label}</Link>
            )}
          </li>
        ))}
      </ul>
      <div className="sheet__actions">
        {me ? (
          <>
            <KonjedButton href={panelHref(me.role)} size="lg" magnetic={false}>پنل من</KonjedButton>
            <button type="button" className="btn btn--secondary btn--lg" onClick={logout}><span className="btn__label">خروج</span></button>
          </>
        ) : (
          <>
            <KonjedButton href={PRIMARY_CTA.href} size="lg" magnetic={false}>{PRIMARY_CTA.label}</KonjedButton>
            <KonjedButton href={AUTH.href} variant="secondary" size="lg" magnetic={false}>{AUTH.label}</KonjedButton>
          </>
        )}
      </div>
    </div>
    </>
  );
}
