import Link from "next/link";

export function KonjedLogo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`logo ${className}`} aria-label="کنجد؛ صفحه اصلی">
      <svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true">
        <path d="M16 2c6 0 12 6 12 14s-5 14-12 14S4 24 4 16 10 2 16 2z" fill="#FFC83D" />
        <path d="M16 2c6 0 12 6 12 14s-5 14-12 14c3-5 4-9 4-14S19 7 16 2z" fill="#E59A00" opacity=".55" />
        <path d="M11 11c2 3 3 6 2 11" stroke="#7a4a00" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity=".6" />
      </svg>
      <span>کنجد</span>
    </Link>
  );
}

