/**
 * Réécrit une URL publique du Storage Supabase vers NOTRE domaine (/media/...)
 * pour qu'un CDN (Cloudflare gratuit) la mette en cache → l'egress Supabase n'est
 * touché qu'au 1ᵉʳ chargement.
 *
 * DÉSACTIVÉ par défaut : ne réécrit que si NEXT_PUBLIC_USE_MEDIA_CDN === "1".
 * → À activer SEULEMENT une fois Cloudflare placé devant le domaine (voir
 *   CDN_CACHE.md). Avant ça, on garde les URLs Supabase d'origine (aucun risque).
 * Client-safe (aucune dépendance serveur).
 */
const MARKER = "/storage/v1/object/public/";
const ENABLED = process.env.NEXT_PUBLIC_USE_MEDIA_CDN === "1";

export function cdnImage<T extends string | null | undefined>(url: T): T {
  if (!ENABLED || !url) return url;
  const i = url.indexOf(MARKER);
  if (i < 0) return url; // pas une URL Storage publique (Bunny, /public, externe…)
  return ("/media/" + url.slice(i + MARKER.length)) as T;
}
