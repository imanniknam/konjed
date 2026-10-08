"use client";

import { useEffect, useMemo, useState } from "react";
import type { GameDto } from "@/lib/server/services/games";
import { KonjedButton } from "../KonjedButton";
import { GameTile } from "./GameTile";

const CATS = ["همه مهارت‌ها", "مهارت‌های نرم", "سواد مالی", "کارآفرینی"] as const;
const SORTS = ["پیشنهادی", "جدیدترین", "محبوب‌ترین", "الفبایی"] as const;
const SKILL_TO_CAT: Record<string, (typeof CATS)[number]> = { "حل مسئله": "مهارت‌های نرم", "تصمیم‌گیری": "مهارت‌های نرم", "کار تیمی": "مهارت‌های نرم", خلاقیت: "مهارت‌های نرم", "ارتباط مؤثر": "مهارت‌های نرم", "مدیریت مالی": "سواد مالی", کارآفرینی: "کارآفرینی" };
const AGES = ["همه سنین", "۱۳ تا ۱۴ سال", "۱۵ تا ۱۷ سال"] as const;
const DURS = ["همه زمان‌ها", "کوتاه", "متوسط"] as const;
const PRICES = ["رایگان و پولی", "رایگان", "پولی"] as const;

type Props = { games: GameDto[]; id?: string; title?: string; text?: string; variant?: "basic" | "filters" };

export function GameCatalog({ games, id = "catalog", title = "همه بازی‌ها", text = "بگرد، انتخاب کن و بازی‌ای رو پیدا کن که بیشتر از همه بهت میاد.", variant = "basic" }: Props) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<(typeof CATS)[number]>("همه مهارت‌ها");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("پیشنهادی");
  const [age, setAge] = useState<(typeof AGES)[number]>("همه سنین");
  const [dur, setDur] = useState<(typeof DURS)[number]>("همه زمان‌ها");
  const [price, setPrice] = useState<(typeof PRICES)[number]>("رایگان و پولی");

  useEffect(() => {
    const sk = new URLSearchParams(window.location.search).get("skill");
    if (sk && SKILL_TO_CAT[sk]) setCat(SKILL_TO_CAT[sk]);
  }, []);

  const list = useMemo(() => {
    const norm = (s: string) => s.replace(/[‌\s]+/g, "").toLowerCase();
    const ageOk = (g: GameDto) => age === "همه سنین" || (g.ageMin != null && g.ageMax != null && (age === "۱۳ تا ۱۴ سال" ? g.ageMin <= 14 : g.ageMax >= 15));
    const durOk = (g: GameDto) => dur === "همه زمان‌ها" || (g.minutes != null && (dur === "کوتاه" ? g.minutes <= 10 : g.minutes > 10 && g.minutes <= 20));
    const priceOk = (g: GameDto) => price === "رایگان و پولی" || g.priceLabel === price;
    const catOk = (g: GameDto) => cat === "همه مهارت‌ها" || g.groupLabel === cat;
    let r = games.filter((g) => catOk(g) && ageOk(g) && durOk(g) && priceOk(g) && (!q.trim() || norm(`${g.title}${g.text}${g.skill}`).includes(norm(q))));
    if (sort === "الفبایی") r = [...r].sort((a, b) => a.title.localeCompare(b.title, "fa"));
    if (sort === "جدیدترین") r = [...r].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
    if (sort === "محبوب‌ترین") r = [...r].sort((a, b) => b.plays - a.plays);
    return r;
  }, [games, q, cat, sort, age, dur, price]);

  return (
    <section className="pg-section" id={id} aria-labelledby={`${id}-title`}>
      <div className="pg-wrap">
        <div className="pg-head">
          <h2 id={`${id}-title`} className="h-display">{title}</h2>
          <p className="lead">{text}</p>
        </div>

        <div className="catalog__bar">
          <label className="search">
            <span className="sr-only">جست‌وجوی بازی</span>
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="دنبال چه بازی‌ای می‌گردی؟" />
          </label>
          <label className="select">
            <span>مرتب‌سازی:</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as (typeof SORTS)[number])}>{SORTS.map((s) => <option key={s}>{s}</option>)}</select>
          </label>
        </div>

        <div className="catalog__cats" role="group" aria-label="دوست داری روی چه مهارتی کار کنی؟">
          <p className="catalog__q">دوست داری روی چه مهارتی کار کنی؟</p>
          <div className="chips-row">{CATS.map((c) => <button key={c} type="button" className="pill" aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>)}</div>
        </div>

        {variant === "filters" && (
          <div className="catalog__filters">
            <label className="select"><span>رده سنی:</span><select value={age} onChange={(e) => setAge(e.target.value as (typeof AGES)[number])}>{AGES.map((a) => <option key={a}>{a}</option>)}</select></label>
            <label className="select"><span>مدت بازی:</span><select value={dur} onChange={(e) => setDur(e.target.value as (typeof DURS)[number])}>{DURS.map((a) => <option key={a}>{a}</option>)}</select></label>
            <label className="select"><span>نوع:</span><select value={price} onChange={(e) => setPrice(e.target.value as (typeof PRICES)[number])}>{PRICES.map((a) => <option key={a}>{a}</option>)}</select></label>
          </div>
        )}

        <p className="sr-only" role="status" aria-live="polite">{list.length} بازی پیدا شد</p>
        {list.length ? (
          <div className="tiles">{list.map((g) => <GameTile key={g.slug} game={g} />)}</div>
        ) : (
          <div className="empty">
            <h3>این بار چیزی پیدا نکردیم!</h3>
            <p>یه فیلتر دیگه امتحان کن یا بین همه بازی‌ها بگرد.</p>
            <button type="button" className="btn btn--primary btn--md" onClick={() => { setQ(""); setCat("همه مهارت‌ها"); setAge("همه سنین"); setDur("همه زمان‌ها"); setPrice("رایگان و پولی"); }}><span className="btn__label">نمایش همه بازی‌ها</span></button>
          </div>
        )}
        <p className="pg-note">در فاز اول فقط بازی‌های تیم کنجد نمایش داده می‌شود؛ بازی‌های سازندگان دیگر با فاز دوم اضافه می‌شود.</p>
        <div className="pg-actions"><KonjedButton href="/games/publish" variant="ghost" size="sm">انتشار بازی (فاز ۲)</KonjedButton></div>
      </div>
    </section>
  );
}
