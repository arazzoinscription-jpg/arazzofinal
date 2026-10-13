import "server-only";

/**
 * Ce dont l'accueil du FEED a besoin côté serveur : LA DELIVERY PAGE à proposer, et son code promo.
 *
 * Une Delivery Page est une page de cours GRATUIT (vidéo + formulaire + code promo) créée dans Arazzo OS
 * (« Delivery Pages ») et publiée sur `/free/<adresse>`. Le feed en affiche UNE dans une fenêtre, après
 * l'invitation au test de niveau ; son code promo est aussi le cadeau de fin de test.
 *
 * Laquelle ? Celle dont l'adresse est réglée dans l'OS (« Textes des landings » → page « feed » →
 * « Adresse de la Delivery Page »). Vide : `FEED_WELCOME_SLUG`, puis « feed ». Changer de page — la vidéo
 * « comment on forme nos candidates » aujourd'hui, un vrai cours gratuit demain — ne demande aucun code.
 *
 * Règles :
 *   - pas de page, page fermée (dépubliée) → `page: null` : l'invitation propose le test, rien de plus ;
 *   - un code expiré, épuisé ou nominatif n'arrive jamais jusqu'ici (filtré côté OS, re-vérifié ici à l'instant T) ;
 *   - toute erreur (Supabase, table absente) est avalée : le feed ne doit JAMAIS tomber pour un popup.
 */

import { createPublicClient } from "@/lib/supabase/public";
import { getLandingTexts } from "@/lib/landing-texts";
import type { Promo } from "@/app/free/[slug]/promo-banner";

export type FeedWelcomeData = {
  /** L'instantané de la Delivery Page (même forme que celui de `/free/<adresse>`), ou `null`. */
  page: Record<string, any> | null;
  /** Le code promo du moment de cette page, ou `null`. */
  promo: Promo | null;
  /** L'adresse lue. */
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

/** Une adresse arabe peut arriver encodée (%D8%AF…) : on la décode sans jamais planter. */
function decoder(slug: string) {
  try { return decodeURIComponent(slug); } catch { return slug; }
}

/** L'adresse de la Delivery Page à proposer : réglée dans l'OS, sinon l'environnement, sinon « feed ». */
export async function feedWelcomeSlug(): Promise<string> {
  let reglee = "";
  try {
    const t = await getLandingTexts("feed");
    reglee = String(t.fr?.tourDeliverySlug || t.ar?.tourDeliverySlug || "").trim();
  } catch { /* on retombe sur le défaut */ }
  return decoder(reglee || (process.env.FEED_WELCOME_SLUG || "").trim() || "feed");
}

export async function loadFeedWelcome(): Promise<FeedWelcomeData> {
  const slug = await feedWelcomeSlug();
  try {
    const supabase = createPublicClient();
    const { data: row } = await supabase
      .from("delivery_page_snapshots")
      .select("data")
      .eq("slug", slug)
      .maybeSingle();
    const brut = (row?.data ?? null) as Record<string, any> | null;
    if (!brut || brut.active !== true) return { page: null, promo: null, slug };
    const promo = promoEncoreValable(brut.promo);
    return { page: { ...brut, promo, slug }, promo, slug };
  } catch {
    return { page: null, promo: null, slug };
  }
}
