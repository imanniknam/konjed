import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import "./globals.css";
import "./scenes.css";
import "./pages.css";

// variable font: ONE file per subset covers every weight (was one file per weight)
const vazir = Vazirmatn({ subsets: ["arabic", "latin"], display: "swap", variable: "--font-vazir" });

const site = process.env.SITE_URL ?? "http://localhost:3000";
export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "کنجد | مهارت‌های زندگی رو بازی کن!", template: "%s" },
  description: "کنجد سکوی بازی‌های آموزشی و یادگیری گیمیفای‌شده است؛ بازی کن، مأموریت انجام بده، دستاورد بگیر و چیزی بساز.",
  applicationName: "کنجد",
  openGraph: { type: "website", locale: "fa_IR", siteName: "کنجد", title: "کنجد | مهارت‌های زندگی رو بازی کن!", description: "بازی‌های مهارتی، چالش‌های واقعی و پروژه‌های خلاقانه برای نوجوان‌ها.", images: [{ url: "/assets/konjed/world/hero-world-md.webp", width: 1920, height: 1080 }] },
  twitter: { card: "summary_large_image" },
};
export const viewport: Viewport = { themeColor: "#070B1F", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fa" dir="rtl" className={vazir.variable} suppressHydrationWarning>
      <head>
        {/* Home only: pick the scroll mode BEFORE first paint so the pinned layout never "switches" after load,
            and hold the page still until the scroll system is ready (failsafe: 5s). No loader screen needed. */}
        <script dangerouslySetInnerHTML={{ __html: '(function(){try{var d=document.documentElement;if(location.pathname!=="/")return;var m=matchMedia,r=m("(prefers-reduced-motion: reduce), (max-height: 519px)").matches;d.dataset.mode=r?"reduced":m("(min-width: 900px)").matches?"cinematic":"mobile";if(!r){d.classList.add("is-locked");setTimeout(function(){d.classList.remove("is-locked")},5000)}}catch(e){}})()' }} />
      </head>
      <body>
        <noscript><style>{".rise{opacity:1;animation:none}html{overflow:auto!important}"}</style></noscript>
        {children}
      </body>
    </html>
  );
}
