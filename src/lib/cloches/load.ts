import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Espace } from "../espace/portee";
import type { CibleCommande } from "../classe/commande";
import { elevesVisees } from "../classe/destinataires";
import { paquets } from "../student-care/paginate";
import { aSonner, notificationCloche } from "./regles";

/**
 * Cloche de classe — lecture / écriture (clé de service, côté serveur uniquement).
 * L'ENVOI d'une cloche = une notification par élève visée (table notifications) : la cloche du site
 * et, en production, le webhook push existant (téléphone, vibration de cloche — voir public/sw.js).
 * Une cloche n'est envoyée qu'UNE fois : réservation atomique de « envoyee_le » avant tout envoi.
 */

const TABLE = "classe_cloches";

export interface LigneCloche {
  id: string;
  created_by: string;
  group_id: string | null;
  course_id: string | null;
  message: string;
  sonne_le: string;
  envoyee_le: string | null;
  destinataires: number | null;
  annulee_le: string | null;
  created_at: string;
}

/** Message d'erreur si la migration 098 n'est pas appliquée, sinon null. */
export async function etatMigrationCloches(admin: SupabaseClient): Promise<string | null> {
  const r = await admin.from(TABLE).select("id").limit(1);
  return r.error ? r.error.message : null;
}

export function cibleDeCloche(c: Pick<LigneCloche, "group_id" | "course_id">): CibleCommande {
  return c.group_id ? { type: "groupe", id: c.group_id } : { type: "niveau", courseId: c.course_id as string };
}

/** Envoie une cloche déjà enregistrée — si personne ne l'a envoyée avant (sinon : rien). */
export async function sonnerCloche(admin: SupabaseClient, espace: Espace, id: string): Promise<{ ok: true; destinataires: number } | { ok: false; erreur: string }> {
  // 1) Réservation atomique : seule la première demande passe.
  const pris = await admin.from(TABLE).update({ envoyee_le: new Date().toISOString() })
    .eq("id", id).is("envoyee_le", null).is("annulee_le", null).select("*").maybeSingle();
  if (pris.error) return { ok: false, erreur: pris.error.message };
  const c = pris.data as LigneCloche | null;
  if (!c) return { ok: false, erreur: "Cloche déjà envoyée ou annulée." };

  // 2) Élèves visées (espace de l'enseignante revérifié), 3) une notification chacune.
  let eleves: string[];
  try { eleves = await elevesVisees(admin, espace, cibleDeCloche(c)); } catch (e) {
    return { ok: false, erreur: e instanceof Error ? e.message : "Élèves illisibles." };
  }
  const n = notificationCloche(c.message);
  for (const lot of paquets(eleves, 500)) {
    // eslint-disable-next-line no-await-in-loop
    const ins = await admin.from("notifications").insert(lot.map((user_id) => ({ user_id, ...n })));
    if (ins.error) return { ok: false, erreur: `Notifications refusées : ${ins.error.message}` };
  }
  await admin.from(TABLE).update({ destinataires: eleves.length }).eq("id", c.id);
  return { ok: true, destinataires: eleves.length };
}

export async function creerCloche(admin: SupabaseClient, c: { created_by: string; cible: CibleCommande; message: string; sonne_le: string }): Promise<{ ok: true; id: string } | { ok: false; erreur: string }> {
  const r = await admin.from(TABLE).insert({
    created_by: c.created_by,
    group_id: c.cible.type === "groupe" ? c.cible.id : null,
    course_id: c.cible.type === "niveau" ? c.cible.courseId : null,
    message: c.message,
    sonne_le: c.sonne_le,
  }).select("id").single();
  if (r.error || !r.data) return { ok: false, erreur: r.error?.message ?? "Cloche non enregistrée." };
  return { ok: true, id: (r.data as { id: string }).id };
}

/** Les cloches de l'enseignante (administration : toutes), récentes et à venir. */
export async function listerCloches(admin: SupabaseClient, espace: Espace): Promise<LigneCloche[]> {
  let q = admin.from(TABLE).select("*").order("sonne_le", { ascending: false }).limit(30);
  if (!espace.estAdmin) q = q.eq("created_by", espace.userId);
  const r = await q;
  if (r.error) throw new Error(r.error.message);
  return (r.data ?? []) as LigneCloche[];
}

/** Cloches programmées arrivées à échéance (pour /api/cron/cloches). */
export async function clochesEchues(admin: SupabaseClient, maintenant: Date): Promise<LigneCloche[]> {
  const r = await admin.from(TABLE).select("*").is("envoyee_le", null).is("annulee_le", null)
    .lte("sonne_le", new Date(maintenant.getTime() + 30_000).toISOString()).order("sonne_le").limit(50);
  if (r.error) throw new Error(r.error.message);
  return ((r.data ?? []) as LigneCloche[]).filter((c) => aSonner(c, maintenant));
}

/** Annule une cloche programmée (pas encore envoyée) ; une formatrice n'annule que les siennes. */
export async function annulerCloche(admin: SupabaseClient, espace: Espace, id: string): Promise<{ ok: true } | { ok: false; erreur: string }> {
  let q = admin.from(TABLE).update({ annulee_le: new Date().toISOString() }).eq("id", id).is("envoyee_le", null).is("annulee_le", null);
  if (!espace.estAdmin) q = q.eq("created_by", espace.userId);
  const r = await q.select("id").maybeSingle();
  if (r.error) return { ok: false, erreur: r.error.message };
  if (!r.data) return { ok: false, erreur: "Cloche déjà envoyée, annulée, ou qui n'est pas la vôtre." };
  return { ok: true };
}
