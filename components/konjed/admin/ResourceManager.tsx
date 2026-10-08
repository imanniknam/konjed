"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, upload } from "@/lib/client/api";
import { dateFa } from "@/lib/format";
import type { AdminField } from "@/lib/server/admin/resources";

type Row = Record<string, any>;
type Props = { resource: string; title: string; fields: AdminField[]; rows: Row[]; canCreate: boolean; canRemove: boolean; hint?: string };

const toLocalInput = (v: unknown) => { if (!v) return ""; const d = new Date(String(v)); if (isNaN(+d)) return ""; const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };

function cell(f: AdminField, v: any) {
  if (v == null || v === "") return "—";
  if (f.type === "checkbox") return v ? "✓" : "—";
  if (f.type === "select") return f.options?.find((o) => o[0] === v)?.[1] ?? String(v);
  if (f.type === "tags") return (v as string[]).join("، ") || "—";
  if (f.type === "datetime") return dateFa(v);
  if (f.type === "image") return <img src={String(v)} alt="" className="rm__thumb" />;
  const s = String(v);
  return s.length > 60 ? s.slice(0, 58) + "…" : s;
}

export function ResourceManager({ resource, title, fields, rows, canCreate, canRemove, hint }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [vals, setVals] = useState<Record<string, any>>({});
  const [err, setErr] = useState<{ msg: string; fields: Record<string, string> } | null>(null);
  const [busy, setBusy] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);

  const cols = fields.filter((f) => f.list);
  const formFields = fields.filter((f) => (editing === "new" ? !(f.createOnly && !canCreate) : !f.createOnly));
  const shown = useMemo(() => { const n = q.trim().toLowerCase(); return n ? rows.filter((r) => JSON.stringify(r).toLowerCase().includes(n)) : rows; }, [rows, q]);

  useEffect(() => { if (editing) dlg.current?.showModal(); else dlg.current?.close(); }, [editing]);

  function open(row: Row | "new") {
    const v: Record<string, any> = {};
    for (const f of fields) {
      const cur = row === "new" ? undefined : row[f.name];
      v[f.name] = f.type === "checkbox" ? !!cur : f.type === "tags" ? (cur ?? []).join("، ") : f.type === "datetime" ? toLocalInput(cur) : f.type === "json" ? (cur ? JSON.stringify(cur, null, 2) : "") : (cur ?? "");
    }
    if (row === "new") for (const f of fields) if (f.type === "select" && f.options && f.required && !v[f.name]) v[f.name] = f.options[0][0];
    setVals(v); setErr(null); setEditing(row);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    const payload: Record<string, unknown> = {};
    for (const f of formFields) {
      const v = vals[f.name];
      if (f.type === "number") { if (v !== "" && v != null) payload[f.name] = Number(v); }
      else if (f.type === "checkbox") payload[f.name] = !!v;
      else if (f.type === "select") { if (v) payload[f.name] = v; }
      else if (f.type === "datetime") { if (v) payload[f.name] = new Date(v).toISOString(); }
      else payload[f.name] = v;
    }
    const res = editing === "new" ? await api("POST", `/api/admin/${resource}`, payload) : await api("PATCH", `/api/admin/${resource}/${(editing as Row).id}`, payload);
    setBusy(false);
    if (!res.ok) { setErr({ msg: res.error.message, fields: res.error.fields ?? {} }); return; }
    setEditing(null); router.refresh();
  }
  async function remove(r: Row) {
    if (!window.confirm("حذف شود؟ این کار قابل بازگشت نیست.")) return;
    const res = await api("DELETE", `/api/admin/${resource}/${r.id}`);
    if (!res.ok) { window.alert(res.error.message); return; }
    router.refresh();
  }
  async function pick(name: string, file: File | undefined) {
    if (!file) return;
    const up = await upload(file);
    if (up.ok) setVals((v) => ({ ...v, [name]: up.data.url })); else setErr({ msg: up.error.message, fields: {} });
  }

  return (
    <section className="panel__block panel__block--wide rm" aria-label={title}>
      <header className="panel__bh">
        <h2>{title} <small className="muted">({rows.length.toLocaleString("fa-IR")})</small></h2>
        <div className="row-actions">
          <label className="search search--sm"><span className="sr-only">جست‌وجو</span><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="جست‌وجو در جدول..." /></label>
          {canCreate && <button type="button" className="btn btn--primary btn--sm" onClick={() => open("new")}><span className="btn__label">＋ افزودن</span></button>}
        </div>
      </header>
      {hint && <p className="muted">{hint}</p>}
      {shown.length ? (
        <div className="tablewrap"><table className="ptable">
          <thead><tr>{cols.map((c) => <th key={c.name}>{c.label}</th>)}<th /></tr></thead>
          <tbody>{shown.map((r) => (
            <tr key={r.id}>
              {cols.map((c, i) => i === 0 ? <th scope="row" key={c.name}>{cell(c, r[c.name])}</th> : <td key={c.name}>{cell(c, r[c.name])}</td>)}
              <td className="rm__act"><button type="button" className="btn btn--ghost btn--sm" onClick={() => open(r)}><span className="btn__label">ویرایش</span></button>{canRemove && <button type="button" className="btn btn--ghost btn--sm rm__del" onClick={() => remove(r)}><span className="btn__label">حذف</span></button>}</td>
            </tr>))}</tbody>
        </table></div>
      ) : <p className="panel__empty">موردی پیدا نشد.</p>}

      <dialog ref={dlg} className="modal modal--wide" onClose={() => setEditing(null)} onClick={(e) => { if (e.target === dlg.current) setEditing(null); }}>
        {editing && (
          <form className="modal__in form" onSubmit={save}>
            <button type="button" className="modal__x" aria-label="بستن" onClick={() => setEditing(null)}>✕</button>
            <h3>{editing === "new" ? `افزودن به «${title}»` : `ویرایش`}</h3>
            <div className="rm__grid">
              {formFields.map((f) => {
                const id = `rm-${resource}-${f.name}`, e = err?.fields[f.name];
                const wide = f.type === "textarea" || f.type === "json" || f.type === "image";
                return (
                  <div key={f.name} className={`field ${wide ? "field--wide" : ""}`}>
                    {f.type === "checkbox" ? (
                      <label className="check"><input type="checkbox" checked={!!vals[f.name]} onChange={(ev) => setVals({ ...vals, [f.name]: ev.target.checked })} /> {f.label}</label>
                    ) : (
                      <>
                        <label htmlFor={id}>{f.label}{f.required && <b aria-hidden="true"> *</b>}</label>
                        {f.hint && <small>{f.hint}</small>}
                        {f.type === "textarea" || f.type === "json" ? <textarea id={id} rows={f.type === "json" ? 5 : 4} dir={f.type === "json" ? "ltr" : undefined} value={vals[f.name] ?? ""} onChange={(ev) => setVals({ ...vals, [f.name]: ev.target.value })} />
                          : f.type === "select" ? <select id={id} value={vals[f.name] ?? ""} onChange={(ev) => setVals({ ...vals, [f.name]: ev.target.value })}><option value="">{f.required ? "انتخاب کن" : "—"}</option>{f.options?.map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select>
                          : f.type === "image" ? (
                            <div className="rm__img">{vals[f.name] && <img src={vals[f.name]} alt="" />}<input id={id} type="text" dir="ltr" value={vals[f.name] ?? ""} onChange={(ev) => setVals({ ...vals, [f.name]: ev.target.value })} placeholder="/assets/… یا آدرس تصویر" /><input type="file" accept="image/png,image/jpeg,image/webp" aria-label="آپلود تصویر" onChange={(ev) => pick(f.name, ev.target.files?.[0])} /></div>)
                          : <input id={id} type={f.type === "number" ? "number" : f.type === "datetime" ? "datetime-local" : f.type === "password" ? "password" : "text"} dir={["url", "number", "datetime", "password"].includes(f.type) || f.name === "slug" || f.name === "code" || f.name === "identifier" || f.name === "accent" ? "ltr" : undefined} value={vals[f.name] ?? ""} onChange={(ev) => setVals({ ...vals, [f.name]: ev.target.value })} required={f.required && f.type !== "number"} autoComplete="off" />}
                      </>
                    )}
                    {e && <small className="field__err" role="alert">{e}</small>}
                  </div>
                );
              })}
            </div>
            <div className="row-actions"><button className="btn btn--primary btn--md" disabled={busy}><span className="btn__label">{busy ? "..." : "ذخیره"}</span></button><button type="button" className="btn btn--ghost btn--md" onClick={() => setEditing(null)}><span className="btn__label">انصراف</span></button></div>
            {err && <p className="form__status form__status--err" role="alert">{err.msg}</p>}
          </form>
        )}
      </dialog>
    </section>
  );
}
