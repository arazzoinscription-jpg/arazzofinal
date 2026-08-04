import "server-only";
import ExcelJS from "exceljs";

/**
 * Feuille de livraison au format XLSX, conforme au modèle officiel de la société
 * de livraison (`model_v5.1.xlsx`) : mêmes 21 colonnes, mêmes intitulés exacts,
 * mêmes couleurs d'en-tête. Le fichier produit s'importe tel quel chez le
 * transporteur.
 *
 * ⚠️ Les intitulés ci-dessous sont recopiés au caractère près (retours à la ligne
 * compris) depuis le modèle : ne pas les reformuler, l'import serait rejeté.
 */

/** Wilaya d'expédition (d'où partent les colis). Surchargeable par `DELIVERY_DEPART_WILAYA`. */
export const DEPART_WILAYA = process.env.DELIVERY_DEPART_WILAYA?.trim() || "Alger";

/** Colonne A → U du modèle, dans l'ordre. */
const HEADERS = [
  "Wilaya de départ",
  "nom",
  "prénom",
  "téléphone\n(si plusieurs numéro,\nséparez les par une virgule)",
  "adresse",
  "commune (nom)",
  "wilaya (nom)",
  "STOP DESK\n(si oui mettez\nl'ID du stopdesk)",
  "numero_commande",
  "produit",
  "prix",
  "Assurer le colis ?\n(oui ou non)\nvoir condition dans le site",
  "valeur déclarée\n(la valeur du contenu du colis)",
  "longueur (en CM)\nfacultatif sauf\nsi surpoids",
  "largeur (en CM)\nfacultatif sauf\nsi surpoids",
  "hauteur (en CM)\nfacultatif sauf\nsi surpoids",
  "poids (en KG)\nfacultatif sauf\nsi surpoids",
  "livraison gratuite\n(si oui mettez OUI\nsinon laissez vide)",
  "FAIRE UN ECHANGE?\n(si oui mettez OUI\nsinon laissez vide)",
  "OBJET A RECUPERER",
  "économique?\n(si oui mettez OUI\nsinon laissez vide)",
] as const;

/** Couleur de fond de chaque en-tête, telle quelle dans le modèle (ARGB). */
const HEADER_FILLS = [
  "FFFF5D5D", "FFFF5D5D", "FFFF5D5D", "FFFF5D5D", "FFFF5D5D", "FFFF5D5D", "FFFF5D5D",
  "FFFF5D5D", "FFFF5D5D", "FFFF5D5D", "FFFF5D5D", // A→K : obligatoires (rouge)
  "FF00B0F0", "FF00B0F0",                          // L→M : assurance (bleu)
  "FF92D050", "FF92D050", "FF92D050", "FF92D050",  // N→Q : dimensions (vert)
  "FFFF5D5D", "FFFF5D5D", "FFFF5D5D", "FFFF5D5D",  // R→U : options (rouge)
] as const;

/** Largeurs de colonne du modèle (A→U ; celles laissées vides gardent la valeur par défaut d'Excel). */
const COLUMN_WIDTHS: Record<string, number> = {
  A: 18.66, B: 18.22, C: 13.22, D: 23.78, E: 30.22, F: 14.78, G: 12,
  H: 17.89, I: 16.78, J: 17.89, K: 26.66, R: 25.89, S: 18.89, T: 22.78, U: 21,
};

/** Une ligne de la feuille : ce que l'app sait d'un colis à expédier. */
export interface DeliveryRow {
  nom: string;
  prenom: string;
  telephone: string;
  adresse: string;
  /** Nom officiel de la commune (fichier nom_officiel_wilayas_communes.xlsx). */
  commune: string;
  /** Nom officiel de la wilaya (fichier nom_officiel_wilayas_communes.xlsx). */
  wilaya: string;
  numeroCommande: string;
  produit: string;
  /** Montant à encaisser à la livraison, en DA. 0 = rien à encaisser. */
  prix: number;
}

/**
 * Coupe un nom complet en « prénom » + « nom » comme l'attend le modèle :
 * le premier mot est le prénom, le reste le nom. Un seul mot ⇒ tout en nom.
 */
export function splitFullName(full: string | null | undefined): { nom: string; prenom: string } {
  const parts = String(full ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { nom: parts[0] ?? "", prenom: "" };
  return { prenom: parts[0], nom: parts.slice(1).join(" ") };
}

/**
 * Construit le classeur XLSX de livraison. Les colonnes facultatives du modèle
 * (stop desk, assurance, dimensions, échange, économique) sont laissées vides :
 * livraison à domicile, sans option.
 */
export async function buildDeliverySheet(rows: DeliveryRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Feuil1");

  const header = ws.getRow(1);
  HEADERS.forEach((label, i) => {
    const cell = header.getCell(i + 1);
    cell.value = label;
    cell.font = { name: "Calibri", size: 11, bold: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILLS[i] } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "medium" }, left: { style: "medium" },
      bottom: { style: "medium" }, right: { style: "medium" },
    };
  });
  header.height = 50.55;

  for (const [letter, width] of Object.entries(COLUMN_WIDTHS)) {
    ws.getColumn(letter).width = width;
  }

  for (const r of rows) {
    ws.addRow([
      DEPART_WILAYA,      // A  Wilaya de départ
      r.nom,              // B  nom
      r.prenom,           // C  prénom
      r.telephone,        // D  téléphone
      r.adresse,          // E  adresse
      r.commune,          // F  commune (nom)
      r.wilaya,           // G  wilaya (nom)
      "",                 // H  STOP DESK — vide = livraison à domicile
      r.numeroCommande,   // I  numero_commande
      r.produit,          // J  produit
      r.prix,             // K  prix à encaisser (DA)
      "",                 // L  Assurer le colis ?
      "",                 // M  valeur déclarée
      "", "", "", "",     // N→Q  longueur / largeur / hauteur / poids
      "",                 // R  livraison gratuite
      "",                 // S  FAIRE UN ECHANGE?
      "",                 // T  OBJET A RECUPERER
      "",                 // U  économique?
    ]);
  }

  // ExcelJS renvoie un ArrayBuffer typé `Buffer` : on normalise pour NextResponse.
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

/** Type MIME du XLSX, pour l'en-tête Content-Type de la réponse. */
export const XLSX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
