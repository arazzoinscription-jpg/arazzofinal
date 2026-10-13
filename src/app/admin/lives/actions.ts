"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminConnecte } from "@/lib/student-care/guard";
import { annulerLive, coursNiveaux, creerLives, modifierLive, ErreurLives, type Resultat } from "@/lib/live-care/load";
import { validerSaisie } from "@/lib/live-care/saisie";

/**
 * Créer / modifier / annuler un live. Ces actions écrivent UNIQUEMENT les données
 * du calendrier et des PLANS de rappel : aucun e-mail, aucune notification, aucun
 * WhatsApp n'est envoyé.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function brut(f: FormData) {
  return {
    titre: f.get("titre"), description: f.get("description"), jour: f.get("jour"), heure: f.get("heure"),
    duree_minutes: f.get("duree_minutes"), lien: f.get("lien"), course_ids: f.getAll("course_ids"),
    recurrence: f.get("recurrence"), jour_fin: f.get("jour_fin"), rappels: f.getAll("rappels"), canaux: f.getAll("canaux"),
  };
}

function message(r: Resultat, verbe: string): string {
  const parts = [`${r.ids.length} live(s) ${verbe}.`, ...r.alertes, ...r.ecartes.map((e) => `Rappel non planifié : ${e}`)];
  return encodeURIComponent(parts.join(" | ").slice(0, 900));
}

export async function creerLiveAction(f: FormData): Promise<void> {
  const moi = await adminConnecte();
  if (!moi) redirect("/dashboard");
  const admin = createAdminClient();
  const niveaux = await coursNiveaux(admin);
  const v = validerSaisie(brut(f), new Set(niveaux.map((n) => n.id)));
  if (!v.ok) redirect(`/admin/lives/nouveau?erreur=${encodeURIComponent(v.erreur)}`);
  let r: Resultat;
  try {
    r = await creerLives(admin, v.saisie, { userId: moi.userId, maintenant: new Date(), niveaux });
  } catch (e) {
    const m = e instanceof ErreurLives || e instanceof Error ? e.message : "Erreur inconnue";
    redirect(`/admin/lives/nouveau?erreur=${encodeURIComponent(m)}`);
  }
  revalidatePath("/admin/lives");
  redirect(`/admin/lives?ok=${message(r, "programmé(s)")}`);
}

export async function modifierLiveAction(f: FormData): Promise<void> {
  const moi = await adminConnecte();
  if (!moi) redirect("/dashboard");
  const id = String(f.get("id") ?? "");
  if (!UUID.test(id)) redirect("/admin/lives?erreur=Live%20invalide");
  const portee = f.get("portee") === "serie" ? "serie" : "occurrence";
  const admin = createAdminClient();
  const niveaux = await coursNiveaux(admin);
  const v = validerSaisie(brut(f), new Set(niveaux.map((n) => n.id)));
  if (!v.ok) redirect(`/admin/lives/${id}/modifier?erreur=${encodeURIComponent(v.erreur)}`);
  let r: Resultat;
  try {
    r = await modifierLive(admin, id, v.saisie, portee, { userId: moi.userId, maintenant: new Date(), niveaux });
  } catch (e) {
    redirect(`/admin/lives/${id}/modifier?erreur=${encodeURIComponent(e instanceof Error ? e.message : "Erreur inconnue")}`);
  }
  revalidatePath("/admin/lives");
  redirect(`/admin/lives/${id}?ok=${message(r, "modifié(s)")}`);
}

export async function annulerLiveAction(f: FormData): Promise<void> {
  const moi = await adminConnecte();
  if (!moi) redirect("/dashboard");
  const id = String(f.get("id") ?? "");
  if (!UUID.test(id)) redirect("/admin/lives?erreur=Live%20invalide");
  if (f.get("confirmation") !== "oui") redirect(`/admin/lives/${id}?erreur=${encodeURIComponent("Cochez la case de confirmation pour annuler.")}`);
  const portee = f.get("portee") === "serie" ? "serie" : "occurrence";
  const admin = createAdminClient();
  let r: Resultat;
  try {
    r = await annulerLive(admin, id, portee, String(f.get("raison") ?? ""), { userId: moi.userId, maintenant: new Date(), niveaux: [] });
  } catch (e) {
    redirect(`/admin/lives/${id}?erreur=${encodeURIComponent(e instanceof Error ? e.message : "Erreur inconnue")}`);
  }
  revalidatePath("/admin/lives");
  redirect(`/admin/lives/${id}?ok=${message(r, "annulé(s)")}`);
}
