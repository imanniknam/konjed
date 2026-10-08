"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client/api";
import { panelHref, resetMe } from "@/lib/client/useMe";
import { PANELS, ROLE_ORDER, type Role } from "@/lib/konjed/pages/panels";

/** Login + signup in one component. Signup = pick a role first (the doc: «ثبت‌نام و انتخاب نقش»). */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [role, setRole] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string>("");
  const [fields, setFields] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    if (mode === "signup" && !role) { setErr("اول نقشت رو انتخاب کن."); return; }
    setBusy(true); setErr(""); setFields({});
    const res = await api<{ role: string }>("POST", `/api/auth/${mode === "login" ? "login" : "register"}`, mode === "login" ? { identifier: fd.identifier, password: fd.password } : { role, displayName: fd.displayName, identifier: fd.identifier, password: fd.password, age: fd.age || undefined });
    setBusy(false);
    if (!res.ok) { setErr(res.error.message); setFields(res.error.fields ?? {}); return; }
    resetMe();
    router.push(next && next.startsWith("/") ? next : panelHref(res.data.role));
    router.refresh();
  }

  const showForm = mode === "login" || role;
  return (
    <>
      {mode === "signup" && (
        <fieldset className="rolepick">
          <legend>نقشت چیه؟</legend>
          <div className="rolepick__row">
            {ROLE_ORDER.map((r) => (
              <label key={r} className={`rolepick__opt rolepick__opt--${r}`} data-on={role === r}>
                <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} />
                <b>{PANELS[r].label}</b>
                <small>{PANELS[r].axis}</small>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {showForm && (
        <form className="form auth__form" method="post" action="#" onSubmit={onSubmit}>
          {mode === "signup" && (
            <div className="field"><label htmlFor="displayName">نام و نام خانوادگی</label><input id="displayName" name="displayName" required minLength={2} autoComplete="name" />{fields.displayName && <small className="field__err">{fields.displayName}</small>}</div>
          )}
          <div className="field"><label htmlFor="identifier">ایمیل یا شماره موبایل</label><input id="identifier" name="identifier" required dir="ltr" autoComplete="username" placeholder="09123456789" />{fields.identifier && <small className="field__err">{fields.identifier}</small>}</div>
          {mode === "signup" && role === "student" && (
            <div className="field"><label htmlFor="age">سن</label><input id="age" name="age" type="number" min={10} max={19} required inputMode="numeric" />{fields.age && <small className="field__err">{fields.age}</small>}</div>
          )}
          <div className="field"><label htmlFor="password">رمز عبور</label><input id="password" name="password" type="password" required minLength={mode === "signup" ? 8 : 1} dir="ltr" autoComplete={mode === "login" ? "current-password" : "new-password"} />{mode === "signup" && <small>حداقل ۸ نویسه</small>}{fields.password && <small className="field__err">{fields.password}</small>}</div>
          <button className="btn btn--primary btn--lg" disabled={busy}><span className="btn__label">{busy ? "لحظه‌ای صبر کن..." : mode === "login" ? "ورود" : "ساخت حساب و شروع ماجراجویی"}</span></button>
          <p className="form__status form__status--err" role="alert">{Object.keys(fields).length ? "" : err}</p>
        </form>
      )}
      <p className="auth__alt">{mode === "login" ? <>حساب نداری؟ <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}>ثبت‌نام کن</Link></> : <>قبلاً ثبت‌نام کردی؟ <Link href="/login">وارد شو</Link></>}</p>
    </>
  );
}
