"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, dateFa, upload } from "@/lib/client/api";

type J = any;
const LABELS: Record<string, string> = {
  title: "عنوان", text: "متن", lead: "متن معرفی", body: "متن توضیح", label: "برچسب دکمه/پیوند", href: "پیوند", eyebrow: "سرتیتر کوچک", ctas: "دکمه‌ها", items: "آیتم‌ها", hero: "بخش هیرو",
  sections: "بخش‌های صفحه", variant: "سبک", primary: "دکمه اصلی", secondary: "دکمه دوم", cta: "دکمه", micro: "میکروکپی", lines: "خط‌ها", scrollHint: "راهنمای اسکرول", steps: "مراحل", closing: "جمله پایانی",
  note: "یادداشت", q: "پرسش", a: "پاسخ", groups: "گروه‌ها", paragraphs: "پاراگراف‌ها", chips: "برچسب‌ها", submit: "متن دکمه ارسال", fields: "فیلدهای فرم", name: "نام فیلد", options: "گزینه‌ها",
  seo: "عنوان سئو (title)", theme: "تم تصویری", slug: "نشانی", kind: "نوع بخش", id: "شناسه لینک (#)", cols: "تعداد ستون", meta: "اطلاعات تکمیلی", value: "مقدار", tag: "برچسب", status: "وضعیت", art: "تصویر",
  nav: "منوی اصلی", auth: "دکمه ورود", footer: "فوتر", columns: "ستون‌ها", links: "پیوندها", brandLine: "شعار زیر لوگو", rights: "متن حقوق", arcade: "کنجد آرکید", school: "مدرسه مهارت", showcase: "ویترین", journey: "کنجد چطور کار می‌کند؟", final: "CTA نهایی",
  featuredLabel: "عنوان دوره‌های منتخب", courseCta: "دکمه جزئیات دوره", makerPrefix: "پیشوند سازنده", viewLabel: "دکمه مشاهده پروژه", children: "زیرمنو", authCta: "CTA کاربر واردشده", linkTo: "لینک چیپ‌ها", endpoint: "آدرس API فرم",
};
const lab = (k: string) => (LABELS[k] ? `${LABELS[k]}` : k);
const LONG = new Set(["text", "lead", "body", "note", "a", "description", "closing", "brandLine"]);
const URLISH = new Set(["src", "art", "image", "cover"]);

const TEMPLATES: Record<string, J> = {
  prose: { kind: "prose", title: "عنوان", paragraphs: ["متن پاراگراف"], ctas: [] },
  cards: { kind: "cards", title: "عنوان", text: "", cols: 3, items: [{ title: "عنوان کارت", text: "متن" }] },
  steps: { kind: "steps", title: "عنوان", text: "", items: [{ title: "مرحله", text: "توضیح" }] },
  skills: { kind: "skills", title: "عنوان", text: "", groups: [{ title: "گروه", items: ["مهارت ۱"] }] },
  chips: { kind: "chips", title: "عنوان", text: "", items: ["مورد ۱"] },
  bullets: { kind: "bullets", title: "عنوان", lead: "", items: ["مورد ۱"] },
  faq: { kind: "faq", title: "سوالات متداول", items: [{ q: "پرسش", a: "پاسخ" }] },
  soon: { kind: "soon", title: "عنوان", text: "متن", note: "به‌زودی" },
  cta: { kind: "cta", title: "عنوان", text: "متن", ctas: [{ label: "دکمه", href: "/" }] },
};

function blank(v: J): J {
  if (typeof v === "string") return "";
  if (typeof v === "number") return 0;
  if (typeof v === "boolean") return false;
  if (Array.isArray(v)) return [];
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "kind" ? x : blank(x)]));
  return "";
}

function Node({ k, v, set, depth = 0 }: { k: string; v: J; set: (x: J) => void; depth?: number }) {
  if (typeof v === "string") {
    const long = LONG.has(k) || v.length > 70 || v.includes("\n");
    return (
      <div className="je__f">
        <label><span>{lab(k)}</span>
          {long ? <textarea rows={Math.min(8, Math.max(2, Math.ceil(v.length / 70)))} value={v} onChange={(e) => set(e.target.value)} /> : <input value={v} dir={k === "href" || URLISH.has(k) || k === "slug" ? "ltr" : undefined} onChange={(e) => set(e.target.value)} />}
        </label>
        {URLISH.has(k) && <input type="file" accept="image/png,image/jpeg,image/webp" aria-label="آپلود تصویر" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const r = await upload(f); if (r.ok) set(r.data.url); else window.alert(r.error.message); }} />}
      </div>
    );
  }
  if (typeof v === "number") return <div className="je__f"><label><span>{lab(k)}</span><input type="number" value={v} onChange={(e) => set(Number(e.target.value))} /></label></div>;
  if (typeof v === "boolean") return <div className="je__f"><label className="check"><input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} /> {lab(k)}</label></div>;
  if (Array.isArray(v)) {
    const move = (i: number, d: number) => { const a = [...v]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; set(a); };
    const isSections = k === "sections";
    return (
      <fieldset className="je__arr" data-depth={depth}>
        <legend>{lab(k)} <small>({v.length})</small></legend>
        {v.map((x, i) => (
          <div className="je__item" key={i}>
            <div className="je__bar"><b>{i + 1}{x && typeof x === "object" && x.kind ? ` · ${x.kind}` : ""}{x && typeof x === "object" && (x.title || x.label) ? ` — ${String(x.title ?? x.label).slice(0, 32)}` : ""}</b>
              <span><button type="button" onClick={() => move(i, -1)} aria-label="بالا">↑</button><button type="button" onClick={() => move(i, 1)} aria-label="پایین">↓</button><button type="button" onClick={() => set(v.filter((_, j) => j !== i))} aria-label="حذف" className="je__x">✕</button></span></div>
            <Node k={`${k}-item`} v={x} set={(n) => set(v.map((y, j) => (j === i ? n : y)))} depth={depth + 1} />
          </div>
        ))}
        {isSections ? (
          <label className="je__add">＋ افزودن بخش جدید
            <select value="" onChange={(e) => { if (e.target.value) set([...v, structuredClone(TEMPLATES[e.target.value])]); }}><option value="">انتخاب نوع بخش…</option>{Object.keys(TEMPLATES).map((t) => <option key={t} value={t}>{t}</option>)}</select></label>
        ) : <button type="button" className="btn btn--ghost btn--sm" onClick={() => set([...v, v.length ? blank(v[v.length - 1]) : ""])}><span className="btn__label">＋ افزودن</span></button>}
      </fieldset>
    );
  }
  if (v && typeof v === "object") {
    return (
      <div className="je__obj" data-depth={depth}>
        {Object.entries(v).map(([kk, x]) => kk === "kind" ? <p key={kk} className="je__kind">نوع بخش: <b>{String(x)}</b></p> : <Node key={kk} k={kk} v={x} set={(n) => set({ ...v, [kk]: n })} depth={depth + 1} />)}
      </div>
    );
  }
  return null;
}

type Loaded = { key: string; data: J; default: J; customized: boolean; revisions: { id: string; createdAt: string }[] };

export function JsonEditor({ docKey, publicHref, title }: { docKey: string; publicHref: string; title: string }) {
  const router = useRouter();
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [data, setData] = useState<J>(null);
  const [raw, setRaw] = useState("");
  const [tab, setTab] = useState<"visual" | "raw">("visual");
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);

  async function load() {
    const r = await api<Loaded>("GET", `/api/admin/cms?key=${encodeURIComponent(docKey)}`);
    if (r.ok) { setDoc(r.data); setData(r.data.data); setRaw(JSON.stringify(r.data.data, null, 2)); setDirty(false); }
    else setMsg({ ok: false, t: r.error.message });
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [docKey]);
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); }; window.addEventListener("beforeunload", h); return () => window.removeEventListener("beforeunload", h); }, [dirty]);

  const edit = (n: J) => { setData(n); setRaw(JSON.stringify(n, null, 2)); setDirty(true); };

  async function save() {
    let payload = data;
    if (tab === "raw") { try { payload = JSON.parse(raw); } catch { setMsg({ ok: false, t: "JSON معتبر نیست." }); return; } }
    setBusy(true); setMsg(null);
    const r = await api("PUT", "/api/admin/cms", { key: docKey, data: payload });
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, t: r.error.message }); return; }
    setMsg({ ok: true, t: "ذخیره شد و همین حالا روی سایت اعمال شد." }); await load(); router.refresh();
  }
  async function reset() {
    if (!window.confirm("تغییرات حذف شود و متن پیش‌فرض برگردد؟ (نسخه فعلی در تاریخچه می‌ماند)")) return;
    await api("DELETE", `/api/admin/cms?key=${encodeURIComponent(docKey)}`); setMsg({ ok: true, t: "به پیش‌فرض برگشت." }); await load(); router.refresh();
  }
  async function restore(id: string) {
    if (!id) return;
    const r = await api("POST", "/api/admin/cms", { key: docKey, revisionId: id });
    setMsg(r.ok ? { ok: true, t: "نسخه برگردانده شد." } : { ok: false, t: r.error.message }); await load(); router.refresh();
  }

  if (!doc) return <p className="panel__empty">{msg ? msg.t : "در حال بارگذاری…"}</p>;
  return (
    <section className="panel__block panel__block--wide je" aria-label={title}>
      <header className="panel__bh">
        <h2>{title} {doc.customized ? <em className="je__badge">ویرایش‌شده</em> : <em className="je__badge je__badge--def">پیش‌فرض</em>}</h2>
        <div className="row-actions">
          <a className="btn btn--ghost btn--sm" href={publicHref} target="_blank" rel="noopener"><span className="btn__label">مشاهده در سایت ↗</span></a>
          {doc.customized && <button type="button" className="btn btn--ghost btn--sm" onClick={reset}><span className="btn__label">بازگشت به پیش‌فرض</span></button>}
          <button type="button" className="btn btn--primary btn--sm" onClick={save} disabled={busy}><span className="btn__label">{busy ? "..." : "ذخیره و انتشار"}</span></button>
        </div>
      </header>
      <div className="chips-row" role="tablist"><button type="button" role="tab" className="pill" aria-pressed={tab === "visual"} onClick={() => setTab("visual")}>ویرایش ساده</button><button type="button" role="tab" className="pill" aria-pressed={tab === "raw"} onClick={() => { setRaw(JSON.stringify(data, null, 2)); setTab("raw"); }}>JSON پیشرفته</button>
        {doc.revisions.length > 0 && <label className="select"><span>تاریخچه:</span><select value="" onChange={(e) => restore(e.target.value)}><option value="">بازگردانی نسخه قبلی…</option>{doc.revisions.map((r) => <option key={r.id} value={r.id}>{dateFa(r.createdAt)} — {new Date(r.createdAt).toLocaleTimeString("fa-IR")}</option>)}</select></label>}</div>
      {msg && <p className={`form__status form__status--${msg.ok ? "ok" : "err"}`} role="status">{msg.t}</p>}
      {tab === "visual" ? <div className="je__tree"><Node k={docKey} v={data} set={edit} /></div> : <textarea className="je__raw" dir="ltr" rows={28} value={raw} onChange={(e) => { setRaw(e.target.value); setDirty(true); }} spellCheck={false} />}
    </section>
  );
}
