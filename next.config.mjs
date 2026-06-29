/** @type {import('next').NextConfig} */
const nextConfig = {
  // Autorise l'upload de photos (quiz pratiques) via Server Actions
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
    // @react-pdf/renderer doit rester externe (pas de bundling Webpack)
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
    // Tree-shaking agressif des gros barrels → bundle par page plus léger.
    optimizePackageImports: ["framer-motion", "recharts", "lucide-react"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "storage.bunnycdn.com" },
      { protocol: "https", hostname: "*.b-cdn.net" },
      { protocol: "https", hostname: "gsqcyghmkgywrxitpiiv.supabase.co" },
      { protocol: "https", hostname: "formation-arazzo.store" },
      { protocol: "https", hostname: "*.formation-arazzo.store" },
      // Images héritées de l'ancien site WordPress (migration) encore référencées en base.
      { protocol: "https", hostname: "formation-arazzo.com" },
      { protocol: "https", hostname: "*.formation-arazzo.com" },
    ],
  },
  async headers() {
    // CSP : autorise self + Supabase + Bunny Stream (vidéos) + Google Fonts.
    // 'unsafe-inline'/'unsafe-eval' restent nécessaires au runtime Next.js (hydratation,
    // styles inline). Un durcissement par nonce est recommandé (voir SECURITY_AUDIT.md).
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "media-src 'self' blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.upstash.io https://www.virustotal.com https://iframe.mediadelivery.net https://*.b-cdn.net https://video.bunnycdn.com",
      "frame-src 'self' https://iframe.mediadelivery.net https://*.b-cdn.net https://www.youtube.com https://player.vimeo.com https://www.facebook.com https://web.facebook.com https://*.facebook.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self' https://*.chargily.com https://*.paypal.com",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
