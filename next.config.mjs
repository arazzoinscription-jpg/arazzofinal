/** @type {import('next').NextConfig} */
const nextConfig = {
  // Autorise l'upload de photos (quiz pratiques) via Server Actions
  experimental: {
    serverActions: { bodySizeLimit: "25mb" },
    // @react-pdf/renderer doit rester externe (pas de bundling Webpack)
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "storage.bunnycdn.com" },
      { protocol: "https", hostname: "*.b-cdn.net" },
      { protocol: "https", hostname: "gsqcyghmkgywrxitpiiv.supabase.co" },
      { protocol: "https", hostname: "formation-arazzo.com" },
      { protocol: "https", hostname: "*.formation-arazzo.com" },
    ],
  },
};

export default nextConfig;
