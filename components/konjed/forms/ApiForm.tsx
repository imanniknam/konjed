"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { api } from "@/lib/client/api";
import type { Field } from "@/lib/konjed/pages/types";

type Props = {
  endpoint: string;
  method?: string;
  fields: Field[];
  submit: string;
  /** static values merged into the payload */
  extra?: Record<string, unknown>;
  success?: string;
  /** navigate after success */
  redirect?: string | ((data: any) => string);
  refresh?: boolean;
  reset?: boolean;
  className?: string;
  footer?: ReactNode;
  onDone?: (data: any) => void;
  id?: string;
};

/** Generic form → JSON API. Shows server-side field errors in Persian next to the fields. */
export function ApiForm({ endpoint, method = "POST", fields, submit, extra, success = "انجام شد.", redirect, refresh, reset = true, className = "", footer, onDone, id }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload: Record<string, unknown> = { ...extra };
    for (const f of fields) { const v = fd.get(f.name); if (v !== null && String(v).trim() !== "") payload[f.name] = String(v); }
    setBusy(true); setMsg(null); setErrs({});
    const res = await api<any>(method, endpoint, payload);
    setBusy(false);
    if (!res.ok) { setErrs(res.error.fields ?? {}); setMsg({ kind: "err", text: res.error.message }); return; }
    setMsg({ kind: "ok", text: success });
    if (reset) form.reset();
    onDone?.(res.data);
    if (redirect) router.push(typeof redirect === "function" ? redirect(res.data) : redirect);
    if (refresh) router.refresh();
  }

  return (
    <form className={`form ${className}`} method="post" action="#" onSubmit={onSubmit} id={id}>
      {fields.map((f) => {
        const fid = `${endpoint.replace(/\W/g, "")}-${f.name}`;
        const err = errs[f.name];
        return (
          <div key={f.name} className={`field field--${f.type ?? "text"}`}>
            {f.type === "radio" ? (
              <fieldset>
                <legend>{f.label}</legend>
                <div className="chips-row">{f.options!.map((o) => <label key={o} className="pill pill--radio"><input type="radio" name={f.name} value={o} /><span>{o}</span></label>)}</div>
              </fieldset>
            ) : (
              <>
                <label htmlFor={fid}>{f.label}{f.required && <b aria-hidden="true"> *</b>}</label>
                {f.hint && <small id={`${fid}-h`}>{f.hint}</small>}
                {f.type === "textarea" ? <textarea id={fid} name={f.name} rows={4} required={f.required} aria-invalid={!!err} />
                  : f.type === "select" ? <select id={fid} name={f.name} required={f.required} defaultValue=""><option value="" disabled>انتخاب کن</option>{f.options!.map((o) => <option key={o} value={o.includes("|") ? o.split("|")[0] : o}>{o.includes("|") ? o.split("|")[1] : o}</option>)}</select>
                  : <input id={fid} name={f.name} type={f.type ?? "text"} required={f.required} aria-invalid={!!err} dir={["email", "url", "tel"].includes(f.type ?? "") ? "ltr" : undefined} autoComplete={f.type === "password" ? "current-password" : undefined} />}
              </>
            )}
            {err && <small className="field__err" role="alert">{err}</small>}
          </div>
        );
      })}
      {footer}
      <button type="submit" className="btn btn--primary btn--lg" disabled={busy}><span className="btn__label">{busy ? "در حال ارسال..." : submit}</span></button>
      <p className={`form__status form__status--${msg?.kind ?? "idle"}`} role="status" aria-live="polite">{msg?.kind === "err" && Object.keys(errs).length ? "لطفاً موارد مشخص‌شده را اصلاح کن." : msg?.text}</p>
    </form>
  );
}
