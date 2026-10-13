"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { baseDepuis, espacePour, niveauxAutorises, voitCours, voitLive, type Espace } from "@/lib/espace/load";
import { annulerLive, coursNiveaux, creerLives, lireLive, modifierLive, ErreurLives, type Resultat } from "@/lib/live-care/load";
import { validerSaisie } from "@/lib/live-care/saisie";

/**
 * Créer / modifier / annuler un live. Ces actions écrivent UNIQUEMENT les données
 * du calendrier et des PLANS de rappel : aucun e-mail, aucune notification, aucun
 * WhatsApp n'est envoyé.
 *
 * Chaque action revérifie l'ESPACE (administration : tout ; formatrice : ses cours) :
 * le champ caché « base » du formulaire ne fait que choisir l'espace demandé, que le
 * serveur contrôle ensuite pour la personne connectée.
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

async function espaceDe(f: FormData): Promise<Espace> {
  const espace = await espacePour(baseDepuis(f.get("base")));
  if (!espace) redirect("/dashboard");
  return espace;
}

export async function creerLiveAction(f: FormData): Promise<void> {
  const espace = await espaceDe(f);
  const b = espace.base;
  const admin = createAdminClient();
  const niveaux = niveauxAutorises(espace, await coursNiveaux(admin));
  const v = validerSaisie(brut(f), new Set(niveaux.map((n) => n.id)));
  if (!v.ok) redirect(`${b}/lives/nouveau?erreur=${encodeURIComponent(v.erreur)}`);
  let r: Resultat;
  try {
    r = await creerLives(admin, v.saisie, { userId: espace.userId, maintenant: new Date(), niveaux });
  } catch (e) {
    const m = e instanceof ErreurLives || e instanceof Error ? e.message : "Erreur inconnue";
    redirect(`${b}/lives/nouveau?erreur=${encodeURIComponent(m)}`);
  }
  revalidatePath(`${b}/lives`);
  redirect(`${b}/lives?ok=${message(r, "programmé(s)")}`);
}

export async function modifierLiveAction(f: FormData): Promise<void> {
  const espace = await espaceDe(f);
  const b = espace.base;
  const id = String(f.get("id") ?? "");
  if (!UUID.test(id)) redirect(`${b}/lives?erreur=Live%20invalide`);
  const portee = f.get("portee") === "serie" ? "serie" : "occurrence";
  const admin = createAdminClient();
  const actuel = await lireLive(admin, id);
  if (!actuel || !voitLive(espace, actuel.live, actuel.cours)) redirect(`${b}/lives?erreur=${encodeURIComponent("Live introuvable dans votre espace.")}`);
  // Niveaux permis : ceux de l'espace + ceux déjà portés par ce live (jamais d'autres).
  const niveaux = (await coursNiveaux(admin)).filter((n) => voitCours(espace, n.id) || actuel.cours.includes(n.id));
  const v = validerSaisie(brut(f), new Set(niveaux.map((n) => n.id)));
  if (!v.ok) redirect(`${b}/lives/${id}/modifier?erreur=${encodeURIComponent(v.erreur)}`);
  let r: Resultat;
  try {
    r = await modifierLive(admin, id, v.saisie, portee, { userId: espace.userId, maintenant: new Date(), niveaux });
  } catch (e) {
    redirect(`${b}/lives/${id}/modifier?erreur=${encodeURIComponent(e instanceof Error ? e.message : "Erreur inconnue")}`);
  }
  revalidatePath(`${b}/lives`);
  redirect(`${b}/lives/${id}?ok=${message(r, "modifié(s)")}`);
}

export async function annulerLiveAction(f: FormData): Promise<void> {
  const espace = await espaceDe(f);
  const b = espace.base;
  const id = String(f.get("id") ?? "");
  if (!UUID.test(id)) redirect(`${b}/lives?erreur=Live%20invalide`);
  if (f.get("confirmation") !== "oui") redirect(`${b}/lives/${id}?erreur=${encodeURIComponent("Cochez la case de confirmation pour annuler.")}`);
  const portee = f.get("portee") === "serie" ? "serie" : "occurrence";
  const admin = createAdminClient();
  const actuel = await lireLive(admin, id);
  if (!actuel || !voitLive(espace, actuel.live, actuel.cours)) redirect(`${b}/lives?erreur=${encodeURIComponent("Live introuvable dans votre espace.")}`);
  let r: Resultat;
  try {
    r = await annulerLive(admin, id, portee, String(f.get("raison") ?? ""), { userId: espace.userId, maintenant: new Date(), niveaux: [] });
  } catch (e) {
    redirect(`${b}/lives/${id}?erreur=${encodeURIComponent(e instanceof Error ? e.message : "Erreur inconnue")}`);
  }
  revalidatePath(`${b}/lives`);
  redirect(`${b}/lives/${id}?ok=${message(r, "annulé(s)")}`);
}
