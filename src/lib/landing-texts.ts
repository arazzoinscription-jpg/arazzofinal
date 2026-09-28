/**
 * Textes des landings édités dans l'OS.
 *
 * L'OS pousse dans Supabase (`landing_texts`, migration 090) les textes
 * d'interface d'une page — { fr: {clé:texte}, ar: {clé:texte} }. Ici on les LIT
 * (anon) et les pages les appliquent PAR-DESSUS leur dictionnaire `T` par défaut :
 *
 *     const t = { ...T[langue], ...(textes?.[langue] ?? {}) };
 *
 * Un champ absent/vide → le texte par défaut est conservé. Best-effort : toute
 * erreur (table absente, réseau) renvoie des overrides vides — jamais d'exception.
 */

import { createPublicClient } from "@/lib/supabase/public";

export type LandingTextes = { fr?: Record<string, string>; ar?: Record<string, string> };

export async function getLandingTexts(page: string): Promise<LandingTextes> {
  try {
    const pub = createPublicClient();
    const { data } = await pub
      .from("landing_texts")
      .select("data")
      .eq("page", page)
      .maybeSingle();
    const d = (data?.data ?? {}) as LandingTextes;
    return { fr: d.fr ?? {}, ar: d.ar ?? {} };
  } catch {
    return { fr: {}, ar: {} };
  }
}
