import type { MetadataRoute } from "next";
import { canonicalSiteUrl } from "@/lib/site-url";

/**
 * robots.txt — généré par Next (App Router), servi sur /robots.txt.
 *
 * Autorise l'indexation de tout le site public, sauf les zones qui n'ont rien à
 * faire dans Google (compte, tunnel d'achat, API, admin). Pointe vers le sitemap
 * pour que Google découvre les pages sans les deviner une par une.
 */
export default function robots(): MetadataRoute.Robots {
  const base = canonicalSiteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api/",
          "/acces",
          "/auth",
          "/checkout",
          "/panier",
          "/confirmation",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
