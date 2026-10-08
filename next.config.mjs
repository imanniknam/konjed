const isProd = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  `connect-src 'self'${isProd ? "" : " ws: wss:"}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  serverExternalPackages: ["pg", "pg-native"],
  async headers() {
    const common = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ];
    return [
      { source: "/:path*", headers: [...common, ...(isProd ? [{ key: "Content-Security-Policy", value: csp }, { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : [])] },
      { source: "/assets/:path*", headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }] },
      // .png URLs are served as their WebP twin to browsers that accept it, so the response varies by Accept
      { source: "/assets/:path*.png", headers: [{ key: "Vary", value: "Accept" }] },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        // every existing `.png` reference (DB rows, CMS content) transparently gets the ~5x lighter WebP twin
        { source: "/assets/:path*.png", has: [{ type: "header", key: "accept", value: ".*image/webp.*" }], destination: "/assets/:path*.webp" },
      ],
    };
  },
};
export default nextConfig;
