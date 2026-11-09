/**
 * Noms COURTS en arabe (4-5 mots) des offres, pour les listes /offres (09/11).
 * Les noms longs (FR, OS) restent sur les landings ; ici on veut lire d'un coup d'œil.
 */
const NIVEAUX: Record<string, string> = {
  "niveau-1": "المستوى الأول · للمبتدئات",
  "niveau-2": "المستوى الثاني · الكلاسيك والسهرة",
  "niveau-3": "المستوى الثالث · ماستر كلاس",
};

/** Le niveau d'une offre d'après son slug ou son champ `level` (« niveau-2 », « presentiel-niveau-2-eulma »…). */
export function niveauDe(...indices: (string | null | undefined)[]): string | null {
  for (const x of indices) {
    const m = String(x ?? "").match(/niveau-?([123])/i);
    if (m) return `niveau-${m[1]}`;
  }
  return null;
}

export function nomCourtNiveau(niveau: string | null): string | null {
  return niveau ? NIVEAUX[niveau] ?? null : null;
}

/** Atelier présentiel : son nom arabe raccourci à 5 mots, sinon « ورشة » + le sujet reconnu. */
export function nomCourtAtelier(nameAr: string | null | undefined, name: string | null | undefined): string {
  const ar = String(nameAr ?? "").replace(/[*—–()]+/g, " ").replace(/\s+/g, " ").trim();
  if (/[؀-ۿ]/.test(ar)) return ar.split(" ").slice(0, 5).join(" ");
  if (/machine/i.test(String(name ?? ""))) return "ورشة استعمال آلة الخياطة";
  return "ورشة خياطة";
}

/** Pack composé : « حزمة المستوى 1 + 2 ». */
export function nomCourtPack(members: unknown, nom?: string | null): string {
  let n = (Array.isArray(members) ? members : []).map((m) => niveauDe(String(m))?.slice(-1)).filter(Boolean);
  // Sinon d'après le nom du pack : « Pack Couture Niveaux 2 + 3 … » → 2 + 3.
  if (!n.length) n = (String(nom ?? "").match(/([123])\s*\+\s*([123])/) ?? []).slice(1);
  return n.length ? `حزمة المستوى ${n.join(" + ")}` : "حزمة بسعر مخفّض";
}
