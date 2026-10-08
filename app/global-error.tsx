"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="fa" dir="rtl">
      <body style={{ background: "#050818", color: "#fff", fontFamily: "Tahoma, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", textAlign: "center" }}>
        <div><h1>مشکلی پیش اومد</h1><p>لطفاً صفحه را دوباره بارگذاری کن.</p><button onClick={reset} style={{ padding: "12px 28px", borderRadius: 999, border: 0, background: "#FFC83D", fontWeight: 800 }}>تلاش دوباره</button></div>
      </body>
    </html>
  );
}
