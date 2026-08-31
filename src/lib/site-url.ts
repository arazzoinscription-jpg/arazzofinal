/**
 * URL canonique du site pour les liens de marque envoyés aux élèves
 * (liens d'accès, emails). Le domaine de production est formation-arazzo.store.
 *
 * On ne renvoie JAMAIS un domaine de preview Vercel (*.vercel.app) ni l'ancien
 * projet : même si la variable NEXT_PUBLIC_SITE_URL est restée sur une ancienne
 * valeur, les liens partagés restent sur le bon domaine. En local
 * (http://localhost…) on conserve l'URL telle quelle pour le développement.
 */
const CANONICAL = "https://www.formation-arazzo.store";

export function brandedSiteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!env) return CANONICAL;
  if (/vercel\.app/i.test(env)) return CANONICAL; // preview ou ancien projet → domaine officiel
  return env.replace(/\/+$/, "");
}

/**
 * URL pour le sitemap et robots.txt : comme `brandedSiteUrl`, mais ne renvoie
 * JAMAIS localhost. Un sitemap est un fichier public destiné à Google — y
 * mettre « http://localhost:3000 » (la valeur de dev) le rendrait inutile.
 */
export function canonicalSiteUrl(): string {
  const url = brandedSiteUrl();
  if (/localhost|127\.0\.0\.1/i.test(url)) return CANONICAL;
  return url;
}
