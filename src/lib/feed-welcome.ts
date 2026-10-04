import "server-only";

/**
 * Ce dont l'accueil du FEED a besoin côté serveur : le code promo de fin de test.
 *
 * Il vient de la Delivery Page dont l'adresse est `FEED_WELCOME_SLUG` (« feed » par défaut) :
 * l'équipe la crée dans Arazzo OS (Delivery Pages), y choisit le code promo (mode « live » ou « coupon »)
 * et le lien qu'elle remet aux personnes qui commentent « feed ». Le feed LIT le même instantané public
 * que la page `/free/<adresse>` : une seule source pour le code, jamais recopié ici.
 *
 * Règles :
 *   - pas de page, page fermée, ou pas de code → `promo: null` : l'accueil propose le test sans parler de cadeau ;
 *   - un code expiré, épuisé ou nominatif n'arrive jamais jusqu'ici (filtré côté OS, et re-vérifié ici à l'instant T) ;
 *   - toute erreur (Supabase, table absente) est avalée : le feed ne doit JAMAIS tomber pour un popup.
 */

import { createPublicClient } from "@/lib/supabase/public";
import type { Promo } from "@/app/free/[slug]/promo-banner";

export type FeedWelcomeData = {
  /** Le code promo du moment, ou `null`. */
  promo: Promo | null;
  /** L'adresse de la Delivery Page lue (pour les logs/tests). */
  slug: string;
};

/** Le code n'est montré que s'il est encore valable À CET INSTANT (l'instantané date de ≤ 5 min). */
export function promoEncoreValable(promo: unknown): Promo | null {
  const p = promo as Promo | null | undefined;
  if (!p?.code) return null;
  if (p.remaining === 0) return null;
  if (p.end_date && Date.parse(p.end_date) <= Date.now()) return null;
  return p;
}

export function feedWelcomeSlug(): string {
  return (process.env.FEED_WELCOME_SLUG || "feed").trim() || "feed";
}

export async function loadFeedWelcome(): Promise<FeedWelcomeData> {
  const slug = feedWelcomeSlug();
  try {
    const supabase = createPublicClient();
    const { data: row } = await supabase
      .from("delivery_page_snapshots")
      .select("data")
      .eq("slug", slug)
      .maybeSingle();
    const page = (row?.data ?? null) as Record<string, any> | null;
    if (!page || page.active !== true) return { promo: null, slug };
    return { promo: promoEncoreValable(page.promo), slug };
  } catch {
    return { promo: null, slug };
  }
}
