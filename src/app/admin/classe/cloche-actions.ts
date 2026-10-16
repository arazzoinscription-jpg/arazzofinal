"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { baseDepuis, espacePour } from "@/lib/espace/load";
import { lireCible } from "@/lib/classe/commande";
import { elevesVisees } from "@/lib/classe/destinataires";
import { HORIZON_JOURS, etatCloche, lireQuand, validerMessageCloche, type EtatCloche } from "@/lib/cloches/regles";
import { annulerCloche, creerCloche, etatMigrationCloches, listerCloches, sonnerCloche, elevesAvecSonnerie } from "@/lib/cloches/load";

/**
 * Cloche de classe. Garde-fous, tous côté serveur :
 *  - espace revérifié (formatrice : SES classes et SES niveaux) ;
 *  - confirmation explicite obligatoire, nombre d'élèves montré avant ;
 *  - une cloche n'est envoyée qu'une fois (réservation atomique) ;
 *  - rien ne se passe si la migration 098 n'est pas appliquée.
 */

const INDISPONIBLE = "La cloche de classe n'est pas encore activée sur ce site (migration 098 à appliquer).";

export async function apercuClocheAction(entree: { base: string; cible: unknown }): Promise<{ ok: true; eleves: number; sonnerie: number; disponible: boolean } | { ok: false; erreur: string }> {
  const espace = await espacePour(baseDepuis(entree.base));
  if (!espace) return { ok: false, erreur: "Accès refusé." };
  const cible = lireCible(entree.cible);
  if (!cible || cible.type === "eleve") return { ok: false, erreur: "Choisissez une classe (groupe) ou un niveau." };
  const admin = createAdminClient();
  try {
    const eleves = await elevesVisees(admin, espace, cible);
    // Celles qui ont activé la sonnerie sur leur téléphone (les autres verront la cloche en ouvrant le site).
    const sonnerie = await elevesAvecSonnerie(admin, eleves);
    return { ok: true, eleves: eleves.length, sonnerie, disponible: !(await etatMigrationCloches(admin)) };
  } catch (e) {
    return { ok: false, erreur: e instanceof Error ? e.message : "Lecture impossible." };
  }
}

export async function creerClocheAction(entree: { base: string; cible: unknown; message: unknown; quand: unknown; confirmation: unknown }):
  Promise<{ ok: true; immediat: boolean; destinataires: number | null; sonneLe: string } | { ok: false; erreur: string }> {
  const espace = await espacePour(baseDepuis(entree.base));
  if (!espace) return { ok: false, erreur: "Accès refusé." };
  const cible = lireCible(entree.cible);
  if (!cible || cible.type === "eleve") return { ok: false, erreur: "Choisissez une classe (groupe) ou un niveau." };
  const m = validerMessageCloche(entree.message);
  if (!m.ok) return { ok: false, erreur: m.erreur };
  const q = lireQuand(entree.quand, new Date());
  if (!q.ok) return { ok: false, erreur: q.erreur };
  if (entree.confirmation !== true) return { ok: false, erreur: "Confirmez (case à cocher) avant de faire sonner la cloche." };

  const admin = createAdminClient();
  if (await etatMigrationCloches(admin)) return { ok: false, erreur: INDISPONIBLE };
  // La classe doit appartenir à l'espace et compter au moins une élève.
  const eleves = await elevesVisees(admin, espace, cible);
  if (!eleves.length) return { ok: false, erreur: "Aucune élève dans cette classe (ou classe hors de votre espace)." };

  const c = await creerCloche(admin, { created_by: espace.userId, cible, message: m.message, sonne_le: q.iso });
  if (!c.ok) return { ok: false, erreur: c.erreur };
  if (!q.immediat) return { ok: true, immediat: false, destinataires: null, sonneLe: q.iso };
  const s = await sonnerCloche(admin, espace, c.id);
  if (!s.ok) return { ok: false, erreur: s.erreur };
  return { ok: true, immediat: true, destinataires: s.destinataires, sonneLe: q.iso };
}

export interface ClocheVue { id: string; message: string; sonneLe: string; etat: EtatCloche; destinataires: number | null; cible: string }

export async function listerClochesAction(entree: { base: string }): Promise<{ ok: true; cloches: ClocheVue[]; horizonJours: number } | { ok: false; erreur: string }> {
  const espace = await espacePour(baseDepuis(entree.base));
  if (!espace) return { ok: false, erreur: "Accès refusé." };
  const admin = createAdminClient();
  if (await etatMigrationCloches(admin)) return { ok: false, erreur: INDISPONIBLE };
  try {
    const lignes = await listerCloches(admin, espace);
    const gIds = [...new Set(lignes.map((l) => l.group_id).filter(Boolean))] as string[];
    const cIds = [...new Set(lignes.map((l) => l.course_id).filter(Boolean))] as string[];
    const [g, c] = await Promise.all([
      gIds.length ? admin.from("groups").select("id, name").in("id", gIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
      cIds.length ? admin.from("courses").select("id, titre_fr").in("id", cIds) : Promise.resolve({ data: [] as { id: string; titre_fr: string }[] }),
    ]);
    const noms = new Map<string, string>([
      ...((g.data ?? []) as { id: string; name: string }[]).map((x) => [x.id, x.name] as [string, string]),
      ...((c.data ?? []) as { id: string; titre_fr: string }[]).map((x) => [x.id, x.titre_fr] as [string, string]),
    ]);
    const maintenant = new Date();
    return {
      ok: true, horizonJours: HORIZON_JOURS,
      cloches: lignes.map((l) => ({
        id: l.id, message: l.message, sonneLe: l.sonne_le, etat: etatCloche(l, maintenant), destinataires: l.destinataires,
        cible: noms.get((l.group_id ?? l.course_id) as string) ?? (l.group_id ? "Groupe" : "Niveau"),
      })),
    };
  } catch (e) {
    return { ok: false, erreur: e instanceof Error ? e.message : "Lecture impossible." };
  }
}

export async function annulerClocheAction(entree: { base: string; id: unknown }): Promise<{ ok: true } | { ok: false; erreur: string }> {
  const espace = await espacePour(baseDepuis(entree.base));
  if (!espace) return { ok: false, erreur: "Accès refusé." };
  if (typeof entree.id !== "string" || !/^[0-9a-f-]{36}$/i.test(entree.id)) return { ok: false, erreur: "Cloche invalide." };
  return annulerCloche(createAdminClient(), espace, entree.id);
}
