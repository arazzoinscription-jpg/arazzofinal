/**
 * Lives pédagogiques — validation de ce que l'administratrice saisit.
 * Module PUR : reçoit un objet simple (déjà extrait du formulaire).
 */

import { RAPPELS_PROPOSES, validerRegle, type Canal, type RegleRappel } from "./rappels";
import { SEMAINES_MAX } from "./recurrence";
import { ecartJours, estHeureValide, estJourValide } from "./temps";

export interface SaisieLive {
  titre: string;
  description: string | null;
  jour: string;          // AAAA-MM-JJ (Alger) — 1re date pour une série
  heure: string;         // HH:MM (Alger)
  duree_minutes: number;
  lien: string | null;
  course_ids: string[];  // au moins un niveau
  recurrence: "unique" | "hebdo";
  jour_fin: string | null;
  rappels: RegleRappel[];
}

export interface Brut {
  titre?: unknown; description?: unknown; jour?: unknown; heure?: unknown; duree_minutes?: unknown;
  lien?: unknown; course_ids?: unknown; recurrence?: unknown; jour_fin?: unknown;
  /** Clés de RAPPELS_PROPOSES cochées (« veille », « heure », « debut », « apres »). */
  rappels?: unknown;
  /** Canaux cochés. */
  canaux?: unknown;
}

const texte = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const liste = (v: unknown) => (Array.isArray(v) ? v.map(String) : typeof v === "string" && v ? [v] : []);

export function validerSaisie(b: Brut, coursAutorises: ReadonlySet<string>): { ok: true; saisie: SaisieLive } | { ok: false; erreur: string } {
  const titre = texte(b.titre);
  if (titre.length < 2 || titre.length > 140) return { ok: false, erreur: "Le titre doit compter entre 2 et 140 caractères." };
  const description = texte(b.description).slice(0, 2000) || null;
  const jour = texte(b.jour);
  if (!estJourValide(jour)) return { ok: false, erreur: "Date invalide." };
  const heure = texte(b.heure);
  if (!estHeureValide(heure)) return { ok: false, erreur: "Heure invalide (format HH:MM, heure d'Alger)." };
  const duree = Number(texte(b.duree_minutes) || 60);
  if (!Number.isInteger(duree) || duree < 5 || duree > 600) return { ok: false, erreur: "La durée doit être comprise entre 5 et 600 minutes." };
  const lien = texte(b.lien) || null;
  if (lien) {
    try {
      const u = new URL(lien);
      if (u.protocol !== "https:") return { ok: false, erreur: "Le lien doit commencer par https://." };
    } catch { return { ok: false, erreur: "Lien invalide." }; }
  }
  const course_ids = [...new Set(liste(b.course_ids))];
  if (course_ids.length === 0) return { ok: false, erreur: "Choisissez au moins un niveau." };
  if (course_ids.some((c) => !coursAutorises.has(c))) return { ok: false, erreur: "Niveau inconnu." };
  const recurrence = texte(b.recurrence) === "hebdo" ? "hebdo" : "unique";
  let jour_fin: string | null = null;
  if (recurrence === "hebdo") {
    jour_fin = texte(b.jour_fin);
    if (!estJourValide(jour_fin)) return { ok: false, erreur: "Date de fin de la série invalide." };
    const ecart = ecartJours(jour, jour_fin);
    if (ecart < 0) return { ok: false, erreur: "La fin de la série précède son début." };
    if (ecart > SEMAINES_MAX * 7) return { ok: false, erreur: `Une série couvre au plus ${SEMAINES_MAX} semaines.` };
  }
  const canaux = [...new Set(liste(b.canaux))] as Canal[];
  if (canaux.includes("whatsapp")) return { ok: false, erreur: "WhatsApp est indisponible : aucun envoi WhatsApp n'est possible depuis le LMS." };
  const cles = new Set(liste(b.rappels));
  const rappels: RegleRappel[] = [];
  try {
    for (const p of RAPPELS_PROPOSES) {
      if (!cles.has(p.cle)) continue;
      for (const canal of canaux) rappels.push(validerRegle({ moment: p.moment, decalage_minutes: p.decalage_minutes, canal }));
    }
  } catch (e) {
    return { ok: false, erreur: (e as Error).message };
  }
  if (cles.size && !canaux.length) return { ok: false, erreur: "Choisissez au moins un canal pour les rappels cochés." };
  return { ok: true, saisie: { titre, description, jour, heure, duree_minutes: duree, lien, course_ids, recurrence, jour_fin, rappels } };
}
