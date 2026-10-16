/**
 * Nom PUBLIC d'un membre (feed, communauté, profils, commentaires, classe des élèves) — module PUR.
 * Vie privée : le nom complet d'une élève n'apparaît JAMAIS aux autres.
 *  - son pseudo s'il en a choisi un ;
 *  - sinon un pseudo automatique : initiales du prénom et du nom + un numéro stable (ex. « AB-482 »),
 *    calculé à l'affichage (rien n'est écrit en base) — il change dès qu'elle choisit son pseudo ;
 *  - l'équipe (formatrices, administration, patronnistes) garde son nom : c'est sa signature publique.
 */

import { getRoles } from "./roles";

export interface PersonnePublique {
  id: string;
  nom?: string | null;
  username?: string | null;
  role?: string | null;
  roles?: string[] | null;
}

/** Comptes dont le nom réel est public (équipe Arazzo). */
export function estEquipePublique(p: Pick<PersonnePublique, "role" | "roles">): boolean {
  return getRoles(p).some((r) => r === "admin" || r === "formateur" || r === "patronniste");
}

function initialesDe(nom: string | null | undefined): string {
  const mots = (nom ?? "").replace(/\(.*?\)/g, " ").replace(/[^\p{L}\s'-]/gu, " ").trim().split(/\s+/).filter(Boolean);
  if (!mots.length) return "M";
  const choisis = mots.length === 1 ? [mots[0]] : [mots[0], mots[mots.length - 1]];
  return choisis.map((m) => m.charAt(0).toLocaleUpperCase("fr")).join("");
}

/** Numéro stable (000–999) tiré de l'identifiant : deux « A.B. » restent distinctes. */
function numeroDe(id: string): string {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return String(h % 1000).padStart(3, "0");
}

/** Pseudo automatique : « AB-482 » (initiales du prénom et du nom + numéro stable). */
export function pseudoAuto(id: string, nom: string | null | undefined): string {
  return `${initialesDe(nom)}-${numeroDe(id || "membre")}`;
}

/** Ce que les AUTRES voient comme nom. */
export function nomPublic(p: PersonnePublique): string {
  if (estEquipePublique(p)) return (p.nom ?? "").trim() || "Arazzo";
  const pseudo = (p.username ?? "").trim();
  if (pseudo) return pseudo;
  return pseudoAuto(p.id, p.nom);
}

/** Lettres pour la pastille d'avatar à partir du nom public (« AB-482 » → « AB »). */
export function initialesPubliques(nom: string): string {
  const auto = /^(\p{L}{1,2})-\d{3}$/u.exec(nom.trim());
  if (auto) return auto[1];
  return (nom.trim().charAt(0) || "?").toLocaleUpperCase("fr");
}
