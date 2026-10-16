/**
 * Résultat du modèle — règles PURES. L'élève publie la photo (ou la vidéo) de son modèle terminé :
 * pendant 24 h, une alerte « Bravo ! » le met en avant sur le feed ; ensuite, c'est une publication
 * comme les autres sur son profil (source « student_result »).
 */

export const DUREE_ALERTE_MS = 24 * 60 * 60_000;
export const DUREE_VIDEO_RESULTAT_MAX_S = 120;

export interface ResultatVue {
  id: string;
  auteurId: string;
  auteur: string;
  avatar: string | null;
  kind: "image" | "video";
  mediaUrl: string | null;
  videoHls: string | null;
  thumbnail: string | null;
  legende: string | null;
  createdAt: string;
}

/** Résultats encore « en alerte » (moins de 24 h), du plus récent au plus ancien, sans ceux déjà fermés. */
export function alertesActives(r: ResultatVue[], maintenant: Date, fermes: ReadonlySet<string> = new Set()): ResultatVue[] {
  return r
    .filter((x) => maintenant.getTime() - new Date(x.createdAt).getTime() < DUREE_ALERTE_MS && !fermes.has(x.id))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function texteAlerte(r: Pick<ResultatVue, "auteur">, autres: number): string {
  return `🎉 Bravo ! ${r.auteur} a terminé son modèle${autres > 0 ? ` (et ${autres} autre${autres > 1 ? "s" : ""})` : ""}`;
}

export function legendeResultat(brut: unknown): string {
  const l = typeof brut === "string" ? brut.replace(/\s+/g, " ").trim().slice(0, 300) : "";
  return l || "Mon modèle est terminé ! 🎉";
}
