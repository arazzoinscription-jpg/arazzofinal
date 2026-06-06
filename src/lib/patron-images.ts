/**
 * Galerie de visuels de patrons (26 photos dans /public/images/patrons).
 * Sert d'illustration par défaut lorsqu'un patron n'a pas de preview_url.
 * Le choix est déterministe : un même patron affiche toujours la même image.
 */
export const PATRON_IMAGES: string[] = Array.from(
  { length: 26 },
  (_, i) => `/images/patrons/${i + 1}.png`,
);

/** Hash stable d'une chaîne (ex. uuid) → index d'image. */
export function patronImage(seed: string | number | null | undefined): string {
  const s = String(seed ?? "");
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return PATRON_IMAGES[h % PATRON_IMAGES.length];
}
