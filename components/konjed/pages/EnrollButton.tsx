"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client/api";
import { useMe } from "@/lib/client/useMe";

export function EnrollButton({ slug }: { slug: string }) {
  const me = useMe();
  const router = useRouter();
  const [state, setState] = useState<{ busy: boolean; msg: string; ok: boolean }>({ busy: false, msg: "", ok: false });
  async function go() {
    if (!me) { router.push(`/login?next=${encodeURIComponent("/courses#registering")}`); return; }
    if (me.role !== "student") { setState({ busy: false, msg: "ثبت‌نام در دوره فقط برای مهارت‌آموزهاست.", ok: false }); return; }
    setState({ busy: true, msg: "", ok: false });
    const res = await api("POST", `/api/courses/${slug}/enroll`);
    setState({ busy: false, ok: res.ok, msg: res.ok ? "ثبت‌نامت انجام شد! مأموریت‌ها توی پنلت منتظرتن." : res.error.message });
    if (res.ok) router.refresh();
  }
  return (
    <div className="enroll">
      <button type="button" className="btn btn--primary btn--md" onClick={go} disabled={state.busy || state.ok}><span className="btn__label">{state.ok ? "ثبت‌نام شدی ✓" : state.busy ? "..." : "ثبت‌نام در دوره"}</span></button>
      {state.msg && <p role="status" className={`form__status form__status--${state.ok ? "ok" : "err"}`}>{state.msg}</p>}
    </div>
  );
}
