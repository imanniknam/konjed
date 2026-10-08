"use client";

import type { Field } from "@/lib/konjed/pages/types";
import { ApiForm } from "../forms/ApiForm";

export function FormSection({ id, title, text, fields, submit, endpoint }: { id?: string; title: string; text?: string; fields: Field[]; submit: string; endpoint: string }) {
  return (
    <section className="pg-section pg-section--form" id={id} aria-labelledby={`${id ?? title}-t`}>
      <div className="pg-wrap pg-wrap--narrow">
        <div className="pg-head">
          <h2 id={`${id ?? title}-t`} className="h-display">{title}</h2>
          {text && <p className="lead">{text}</p>}
        </div>
        <ApiForm endpoint={endpoint} fields={fields} submit={submit} success={endpoint.includes("game-submissions") ? "بازی‌ات دریافت شد! وضعیت درخواست رو توی پنل کاربری دنبال کن." : endpoint.includes("collab") ? "درخواست همکاری‌ات ثبت شد؛ به‌زودی باهات تماس می‌گیریم." : "پیامت ثبت شد؛ ممنون که نوشتی!"} />
      </div>
    </section>
  );
}
