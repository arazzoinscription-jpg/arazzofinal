/** @type {import('next').NextConfig} */
const nextConfig = {
  // Autorise l'upload de photos (quiz pratiques) via Server Actions
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
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
