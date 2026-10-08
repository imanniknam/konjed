import { Suspense } from "react";
import { KonjedFooter } from "../KonjedFooter";
import { KonjedNavigation } from "../KonjedNavigation";
import { AuthForm } from "../forms/AuthForm";

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  return (
    <>
      <KonjedNavigation />
      <main id="main" className="auth">
        <div className="auth__inner auth__inner--narrow">
          <p className="eyebrow">پنل کاربری · ورود / ثبت‌نام</p>
          <h1 className="h-display">{mode === "login" ? "ورود به کنجد" : "ثبت‌نام در کنجد"}</h1>
          <p className="lead">{mode === "login" ? "بعد از ورود، مستقیم به پنل مخصوص نقشت می‌ری." : "نقش خودت رو انتخاب کن؛ هر نقش پنل مخصوص خودش رو داره."}</p>
          <Suspense fallback={null}><AuthForm mode={mode} /></Suspense>
        </div>
      </main>
      <KonjedFooter />
    </>
  );
}
