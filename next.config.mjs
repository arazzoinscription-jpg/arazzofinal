/** @type {import('next').NextConfig} */
const nextConfig = {
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
