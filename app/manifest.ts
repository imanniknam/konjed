import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return { name: "کنجد", short_name: "کنجد", description: "مهارت‌های زندگی رو بازی کن!", start_url: "/", display: "standalone", dir: "rtl", lang: "fa", background_color: "#050818", theme_color: "#070B1F", icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }] };
}
