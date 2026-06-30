// Constantes partagées — module neutre (sans directive serveur), importable côté client ET serveur.
export const MESURE_FIELDS = [
  "Tour de poitrine",
  "Tour de taille",
  "Tour de hanches",
  "Tour de bras",
  "Longueur du dos",
  "Largeur d'épaules",
  "Longueur de manche",
  "Hauteur totale",
] as const;

/* ───────────────── Type de prestation sur mesure : patron | placement ─────────────────
 * Le pipeline (devis → acceptation → patronniste → livraison → paiement → téléchargement)
 * est commun aux deux. Le TYPE est lu depuis la colonne `type` si elle existe en base,
 * sinon depuis un marqueur en tête de note (compat sans migration). `displayNote` retire
 * le marqueur à l'affichage : la cliente ne le voit jamais.
 * Pour rendre le type 100 % « colonne », appliquer scripts/sql/add-sur-mesure-type.sql. */
export type SurMesureType = "patron" | "placement";

const PLACEMENT_TAG = "[[placement]]";

export const SUR_MESURE = {
  patron: { label: "Patron sur mesure", short: "Patron", noun: "patron", icon: "Ruler" },
  placement: { label: "Placement sur mesure", short: "Placement", noun: "placement", icon: "LayoutGrid" },
} as const;

/** Construit la note à enregistrer (marqueur de type en tête si placement). */
export function buildSurMesureNote(type: SurMesureType, rawNote: string): string | null {
  const clean = (rawNote || "").trim();
  if (type === "placement") return clean ? `${PLACEMENT_TAG}\n${clean}` : PLACEMENT_TAG;
  return clean || null;
}

/** Déduit le type d'une commande : colonne `type`, sinon `mesures`, sinon marqueur de note. */
export function orderType(o: { type?: string | null; note?: string | null; mesures?: any }): SurMesureType {
  if (o?.type === "placement") return "placement";
  const m = o?.mesures;
  if (m && (m.kind === "placement_patron" || m.type === "placement")) return "placement";
  if (typeof o?.note === "string" && o.note.startsWith(PLACEMENT_TAG)) return "placement";
  return "patron";
}

/** Note destinée à l'affichage (marqueur retiré). */
export function displayNote(note?: string | null): string {
  if (!note) return "";
  return note.startsWith(PLACEMENT_TAG) ? note.slice(PLACEMENT_TAG.length).replace(/^\n/, "").trim() : note;
}
