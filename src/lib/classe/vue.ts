/**
 * « Ma classe » — ce que montre chaque carte d'élève. Module PUR (client et serveur).
 *
 * Tout vient du suivi pédagogique existant (`student-care/rules.ts`), rien n'est recalculé :
 *  - la COULEUR traduit la dernière activité pédagogique RÉELLE (leçon terminée, quiz,
 *    travail pratique) selon les seuils du suivi — jamais une présence « en ligne »,
 *    que le LMS n'enregistre pas ;
 *  - « jamais connectée », « connectée sans progresser » et « données indisponibles »
 *    ont chacune leur teinte, distincte du vert / jaune / rouge.
 */

import type { SuiviEleve } from "../student-care/rules";
import { LIBELLE_ACTION, type CodeAction } from "../student-care/rules";
import type { CodeNiveau } from "../student-care/levels";
import { ilYA, joursDepuis } from "../student-care/time";

export type Teinte = "vert" | "jaune" | "rouge" | "jamais" | "sans_progression" | "indisponible";

export const TEINTES: readonly Teinte[] = ["rouge", "jaune", "vert", "sans_progression", "jamais", "indisponible"];

export const LIBELLE_TEINTE: Record<Teinte, string> = {
  vert: "Activité récente",
  jaune: "Activité ralentie",
  rouge: "Inactive — intervention",
  jamais: "Jamais connectée",
  sans_progression: "Se connecte sans progresser",
  indisponible: "Données indisponibles",
};

/**
 * Teinte d'une élève, d'après son statut de suivi.
 * « Données indisponibles » : inscription importée de l'ancien système (son historique
 * antérieur n'a jamais été enregistré) ET aucune activité captée depuis — on ne peut
 * pas dire qu'elle ne progresse pas.
 */
export function teinte(s: Pick<SuiviEleve, "statut" | "importee" | "derniere_activite">): Teinte {
  if (s.statut === "jamais_connectee") return "jamais";
  if (s.importee && !s.derniere_activite) return "indisponible";
  if (s.statut === "sans_activite") return "sans_progression";
  if (s.statut === "active") return "vert";
  if (s.statut === "ralentie") return "jaune";
  return "rouge";
}

const GENRE_ACTIVITE = { lecon: "Leçon terminée", quiz: "Quiz", travail: "Travail pratique" } as const;

export interface CarteEleve {
  id: string;
  nom: string;
  initiales: string;
  avatar: string | null;
  niveaux: CodeNiveau[];
  teinte: Teinte;
  /** Progression du cours de référence (null = cours sans leçon : jamais « 0 % » inventé). */
  progression: { pct: number | null; faites: number; total: number; titre: string } | null;
  /** Dernière activité pédagogique réelle, en clair. */
  activite: { libelle: string; quand: string } | null;
  /** Se connecte récemment mais sans activité pédagogique depuis longtemps. */
  connexion_sans_progres: string | null;
  action: { code: CodeAction; libelle: string };
  alertes: number;
  /** Texte de recherche normalisé (nom + pseudo). */
  cle: string;
}

/** « Amina Benali » → « AB » ; « fella » → « F ». */
export function initiales(nom: string): string {
  const mots = nom.replace(/\(.*?\)/g, " ").trim().split(/\s+/).filter(Boolean);
  if (!mots.length) return "?";
  const lettres = (mots.length === 1 ? [mots[0]] : [mots[0], mots[mots.length - 1]]).map((m) => m.charAt(0).toLocaleUpperCase("fr"));
  return lettres.join("");
}

/** Minuscules sans accents, pour une recherche tolérante (« hélène » trouve « Helene »). */
export function normaliser(texte: string): string {
  return texte.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** URL d'avatar acceptée : http(s) seulement (jamais javascript: ou data:). */
export function avatarSur(url: string | null | undefined): string | null {
  const u = (url ?? "").trim();
  return /^https?:\/\//i.test(u) ? u : null;
}

export function versCarte(s: SuiviEleve, avatar: string | null, maintenant: Date, seuilActiveJours: number): CarteEleve {
  const t = teinte(s);
  const ref = s.reference;
  const joursConnexion = joursDepuis(s.derniere_auth, maintenant);
  const connexionRecente = joursConnexion !== null && joursConnexion < seuilActiveJours;
  return {
    id: s.user_id,
    nom: s.nom,
    initiales: initiales(s.nom),
    avatar: avatarSur(avatar),
    niveaux: s.niveaux,
    teinte: t,
    progression: ref ? { pct: ref.pourcentage, faites: ref.lecons_faites, total: ref.lecons_total, titre: ref.titre } : null,
    activite: s.derniere_activite
      ? { libelle: GENRE_ACTIVITE[s.derniere_activite.genre], quand: ilYA(joursDepuis(s.derniere_activite.le, maintenant)) }
      : null,
    connexion_sans_progres: (t === "jaune" || t === "rouge") && connexionRecente
      ? `Connectée ${ilYA(joursConnexion)}, mais sans activité pédagogique${s.jours_sans_activite !== null ? ` depuis ${s.jours_sans_activite} j` : ""}`
      : null,
    action: { code: s.action.code, libelle: LIBELLE_ACTION[s.action.code] },
    alertes: s.blocages.length + s.taches_enseignante.length,
    cle: normaliser(`${s.nom} ${s.pseudo ?? ""}`),
  };
}

export interface FiltresClasse { q: string; niveau: CodeNiveau | null; teinte: Teinte | null }

export function lireFiltresClasse(p: Record<string, string | string[] | undefined>): FiltresClasse {
  const un = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const niveau = un(p.niveau);
  const t = un(p.teinte);
  return {
    q: un(p.q).slice(0, 80),
    niveau: niveau === "N1" || niveau === "N2" || niveau === "N3" ? niveau : null,
    teinte: (TEINTES as readonly string[]).includes(t) ? (t as Teinte) : null,
  };
}

export function filtrerCartes(cartes: CarteEleve[], f: FiltresClasse): CarteEleve[] {
  const q = normaliser(f.q);
  return cartes.filter((c) =>
    (!q || c.cle.includes(q))
    && (!f.niveau || c.niveaux.includes(f.niveau))
    && (!f.teinte || c.teinte === f.teinte));
}

/** Ordre d'affichage : d'abord celles qui demandent une intervention. */
const PRIORITE: Record<Teinte, number> = { rouge: 0, sans_progression: 1, jamais: 2, jaune: 3, indisponible: 4, vert: 5 };

export function trierCartes(cartes: CarteEleve[]): CarteEleve[] {
  return [...cartes].sort((a, b) => PRIORITE[a.teinte] - PRIORITE[b.teinte] || a.nom.localeCompare(b.nom, "fr"));
}

export function compterTeintes(cartes: CarteEleve[]): Record<Teinte, number> {
  const c = Object.fromEntries(TEINTES.map((t) => [t, 0])) as Record<Teinte, number>;
  for (const x of cartes) c[x.teinte] += 1;
  return c;
}
