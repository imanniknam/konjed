import { KonjedButton } from "@/components/konjed/KonjedButton";
import { KonjedFooter } from "@/components/konjed/KonjedFooter";
import { KonjedNavigation } from "@/components/konjed/KonjedNavigation";

export default function NotFound() {
  return (
    <>
      <KonjedNavigation />
      <main id="main" className="soon">
        <img src="/assets/konjed/world/island-mini.png" alt="" aria-hidden="true" width="140" />
        <h1 className="h-display">این جزیره روی نقشه نیست!</h1>
        <p className="lead">صفحه‌ای که دنبالش بودی پیدا نشد؛ شاید آدرسش عوض شده یا هنوز ساخته نشده.</p>
        <div className="actions"><KonjedButton href="/">بازگشت به صفحه اصلی</KonjedButton><KonjedButton href="/games" variant="secondary">رفتن به کنجد آرکید</KonjedButton></div>
      </main>
      <KonjedFooter />
    </>
  );
}
