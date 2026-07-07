// Taxonomie des patrons — source de vérité partagée entre l'admin (saisie) et la
// boutique publique (filtres). Deux dimensions, comme un vrai site de mode :
//   • GENRE          : femme / homme / enfant / mixte
//   • TYPE DE VÊTEMENT : robe, jupe, pantalon, haut, veste, ensemble, traditionnel, accessoire
//
// Les `keywords` servent de repli pour les patrons anciens NON encore taggés
// (colonnes genre/type_vetement vides) : on infère la catégorie depuis le texte.

export type Lang = "fr" | "ar" | "en";
export type Genre = "femme" | "homme" | "enfant" | "mixte";
export type TypeVetement =
  | "robe" | "jupe" | "pantalon" | "haut" | "veste" | "ensemble" | "traditionnel" | "accessoire";

export interface GenreDef { slug: Genre; label: Record<Lang, string>; emoji: string; keywords: string[]; }
export interface TypeDef { slug: TypeVetement; label: Record<Lang, string>; keywords: string[]; }

export const GENRES: GenreDef[] = [
  { slug: "femme",  label: { fr: "Femme",  ar: "نساء",   en: "Women" }, emoji: "👗", keywords: ["femme", "dame", "robe", "jupe", "blouse", "chemisier", "tailleur", "combinaison"] },
  { slug: "homme",  label: { fr: "Homme",  ar: "رجال",   en: "Men" },   emoji: "👔", keywords: ["homme", "costume", "chemise homme", "veste homme", "pantalon homme", "gandoura homme"] },
  { slug: "enfant", label: { fr: "Enfant", ar: "أطفال",  en: "Kids" },  emoji: "🧒", keywords: ["enfant", "enfants", "bébé", "bebe", "fille", "garçon", "garcon", "kids", "junior"] },
  { slug: "mixte",  label: { fr: "Mixte",  ar: "للجميع", en: "Unisex" }, emoji: "♾️", keywords: ["mixte", "unisexe", "unisex"] },
];

export const TYPES: TypeDef[] = [
  { slug: "robe",         label: { fr: "Robes",         ar: "فساتين",       en: "Dresses" },     keywords: ["robe", "robes", "dress"] },
  { slug: "jupe",         label: { fr: "Jupes",         ar: "تنانير",       en: "Skirts" },      keywords: ["jupe", "jupes", "skirt"] },
  { slug: "pantalon",     label: { fr: "Pantalons",     ar: "سراويل",       en: "Trousers" },    keywords: ["pantalon", "pantalons", "sarouel", "sarwal", "jean", "short", "trouser", "pants"] },
  { slug: "haut",         label: { fr: "Hauts & blouses", ar: "بلوزات",     en: "Tops" },        keywords: ["haut", "hauts", "blouse", "chemise", "chemisier", "top", "t-shirt", "tunique"] },
  { slug: "veste",        label: { fr: "Vestes & manteaux", ar: "سترات",   en: "Jackets" },     keywords: ["veste", "vestes", "manteau", "blazer", "gilet", "cardigan", "jacket", "coat"] },
  { slug: "ensemble",     label: { fr: "Ensembles",     ar: "أطقم",         en: "Sets" },        keywords: ["ensemble", "ensembles", "tailleur", "combinaison", "set", "coord"] },
  { slug: "traditionnel", label: { fr: "Traditionnel",  ar: "تقليدي",       en: "Traditional" }, keywords: ["caftan", "karakou", "djellaba", "gandoura", "haik", "takchita", "burnous", "kabyle", "traditionnel"] },
  { slug: "accessoire",   label: { fr: "Accessoires",   ar: "إكسسوارات",    en: "Accessories" }, keywords: ["accessoire", "sac", "chapeau", "écharpe", "echarpe", "foulard", "châle", "chale", "bonnet", "bag"] },
];

const GENRE_SLUGS = new Set<string>(GENRES.map((g) => g.slug));
const TYPE_SLUGS = new Set<string>(TYPES.map((t) => t.slug));

export function genreLabel(slug: string | null | undefined, lang: Lang): string | null {
  const g = GENRES.find((x) => x.slug === slug);
  return g ? g.label[lang] : null;
}
export function typeLabel(slug: string | null | undefined, lang: Lang): string | null {
  const t = TYPES.find((x) => x.slug === slug);
  return t ? t.label[lang] : null;
}

/** Texte de recherche d'un patron (titre + description + tissu + tailles), minuscule. */
function haystack(p: { titre?: string | null; description?: string | null; tissu?: string | null; tailles?: string | null }): string {
  return [p.titre, p.description, p.tissu, p.tailles].filter(Boolean).join(" ").toLowerCase();
}

/** Genre effectif : la colonne si renseignée, sinon inféré par mots-clés (repli). */
export function resolveGenre(p: { genre?: string | null; titre?: string | null; description?: string | null; tissu?: string | null; tailles?: string | null }): Genre | null {
  if (p.genre && GENRE_SLUGS.has(p.genre)) return p.genre as Genre;
  const hay = haystack(p);
  for (const g of GENRES) if (g.slug !== "mixte" && g.keywords.some((k) => hay.includes(k))) return g.slug;
  return null;
}

/** Type effectif : la colonne si renseignée, sinon inféré par mots-clés (repli). */
export function resolveType(p: { type_vetement?: string | null; titre?: string | null; description?: string | null; tissu?: string | null; tailles?: string | null }): TypeVetement | null {
  if (p.type_vetement && TYPE_SLUGS.has(p.type_vetement)) return p.type_vetement as TypeVetement;
  const hay = haystack(p);
  for (const t of TYPES) if (t.keywords.some((k) => hay.includes(k))) return t.slug;
  return null;
}
