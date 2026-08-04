import { WILAYAS, WILAYA_NAMES, COMMUNES_BY_WILAYA } from "./wilayas";

/**
 * Rattrapage des saisies libres d'AVANT les menus déroulants : la base contient
 * des wilayas en arabe (« وهران »), sans accents (« Setif ») ou avec des variantes
 * d'orthographe. La société de livraison n'accepte QUE les noms officiels du
 * fichier `nom_officiel_wilayas_communes.xlsx`, alors on retrouve le bon nom.
 */

/** Nom arabe usuel de chaque wilaya, indexé par son code officiel. */
const ARABIC_BY_CODE: Record<number, string> = {
  1: "أدرار", 2: "الشلف", 3: "الأغواط", 4: "أم البواقي", 5: "باتنة",
  6: "بجاية", 7: "بسكرة", 8: "بشار", 9: "البليدة", 10: "البويرة",
  11: "تمنراست", 12: "تبسة", 13: "تلمسان", 14: "تيارت", 15: "تيزي وزو",
  16: "الجزائر", 17: "الجلفة", 18: "جيجل", 19: "سطيف", 20: "سعيدة",
  21: "سكيكدة", 22: "سيدي بلعباس", 23: "عنابة", 24: "قالمة", 25: "قسنطينة",
  26: "المدية", 27: "مستغانم", 28: "المسيلة", 29: "معسكر", 30: "ورقلة",
  31: "وهران", 32: "البيض", 33: "إليزي", 34: "برج بوعريريج", 35: "بومرداس",
  36: "الطارف", 37: "تندوف", 38: "تيسمسيلت", 39: "الوادي", 40: "خنشلة",
  41: "سوق أهراس", 42: "تيبازة", 43: "ميلة", 44: "عين الدفلى", 45: "النعامة",
  46: "عين تموشنت", 47: "غرداية", 48: "غليزان", 49: "تيميمون", 50: "برج باجي مختار",
  51: "أولاد جلال", 52: "بني عباس", 53: "عين صالح", 54: "عين قزام", 55: "تقرت",
  56: "جانت", 57: "المغير", 58: "المنيعة",
};

/**
 * Réduit un texte à une forme comparable, pour rapprocher deux orthographes du
 * même lieu : accents latins supprimés, variantes arabes unifiées
 * (أ إ آ ٱ → ا, ة → ه, ى → ي), article « ال » retiré en tête de mot, puis tous les
 * séparateurs supprimés. « Sétif » = « SETIF » = « setif » ; « M'Sila » = « Msila ».
 */
function key(input: string): string {
  const cleaned = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")                     // accents latins combinants
    .replace(/[ً-ْـ]/g, "")               // diacritiques + tatweel arabes
    .replace(/[أإآٱ]/g, "ا")    // أ إ آ ٱ → ا
    .replace(/ة/g, "ه")                        // ة → ه
    .replace(/ى/g, "ي")                        // ى → ي
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")                    // apostrophes, tirets, ponctuation
    .trim();
  return cleaned
    .split(" ")
    // « الجزائر » → « جزائر » : l'article est écrit tantôt collé, tantôt omis.
    .map((w) => (w.length > 2 && w.startsWith("ال") ? w.slice(2) : w))
    .join("");
}

/** Index clé normalisée → nom officiel, construit une fois au chargement. */
const WILAYA_INDEX = new Map<string, string>();
for (const w of WILAYAS) {
  WILAYA_INDEX.set(key(w.nom), w.nom);
  const ar = ARABIC_BY_CODE[w.id];
  if (ar) WILAYA_INDEX.set(key(ar), w.nom);
}

const COMMUNE_INDEX = new Map<string, Map<string, string>>();
for (const [wilaya, communes] of Object.entries(COMMUNES_BY_WILAYA)) {
  const idx = new Map<string, string>();
  for (const c of communes) idx.set(key(c), c);
  COMMUNE_INDEX.set(wilaya, idx);
}

/**
 * Retrouve le nom officiel d'une wilaya à partir d'une saisie libre (français,
 * arabe, sans accents…). `null` si aucune correspondance sûre.
 */
export function normalizeWilaya(input: string | null | undefined): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  if (WILAYA_NAMES.includes(raw)) return raw; // déjà officiel
  return WILAYA_INDEX.get(key(raw)) ?? null;
}

/**
 * Retrouve le nom officiel d'une commune DANS une wilaya donnée. La wilaya doit
 * déjà être officielle (passer par `normalizeWilaya` avant). `null` si la commune
 * est inconnue ou n'appartient pas à cette wilaya.
 */
export function normalizeCommune(
  wilaya: string | null | undefined,
  input: string | null | undefined,
): string | null {
  const raw = String(input ?? "").trim();
  if (!wilaya || !raw) return null;
  const idx = COMMUNE_INDEX.get(wilaya);
  if (!idx) return null;
  return idx.get(key(raw)) ?? null;
}

/** Champs bloquant l'export d'une ligne. */
export type MissingField = "wilaya" | "commune" | "phone" | "address";

/** Adresse de livraison prête pour l'export, ou la liste de ce qui manque. */
export interface DeliveryAddressCheck {
  /** Nom officiel retrouvé, ou `null` si la saisie est inexploitable. */
  wilaya: string | null;
  commune: string | null;
  missing: MissingField[];
  ok: boolean;
}

/**
 * Vérifie qu'une ligne peut partir dans la feuille de livraison. La société de
 * livraison rejette TOUT le fichier dès la première ligne invalide, donc on filtre
 * en amont plutôt que de produire un fichier refusé à l'import.
 */
export function checkDeliveryAddress(row: {
  wilaya?: string | null; commune?: string | null;
  phone?: string | null; address?: string | null;
}): DeliveryAddressCheck {
  const wilaya = normalizeWilaya(row.wilaya);
  const commune = normalizeCommune(wilaya, row.commune);
  const missing: MissingField[] = [];
  if (!wilaya) missing.push("wilaya");
  if (!commune) missing.push("commune");
  if (!String(row.phone ?? "").trim()) missing.push("phone");
  if (!String(row.address ?? "").trim()) missing.push("address");
  return { wilaya, commune, missing, ok: missing.length === 0 };
}

/** Libellés français des champs manquants, pour les messages d'interface. */
export const MISSING_LABELS: Record<MissingField, string> = {
  wilaya: "wilaya", commune: "commune", phone: "téléphone", address: "adresse",
};
