"use client";

import { useEffect } from "react";

/** Last-resort boundary for a failed page: friendly Persian message + retry. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main id="main" className="soon">
      <h1 className="h-display">یه چیزی خراب شد!</h1>
      <p className="lead">مشکلی پیش اومد و صفحه بارگذاری نشد. دوباره امتحان کن؛ اگه ادامه داشت به پشتیبانی خبر بده{error.digest ? ` (کد: ${error.digest})` : ""}.</p>
      <div className="actions"><button type="button" className="btn btn--primary btn--lg" onClick={reset}><span className="btn__label">تلاش دوباره</span></button><a className="btn btn--secondary btn--lg" href="/"><span className="btn__label">صفحه اصلی</span></a></div>
    </main>
  );
}
