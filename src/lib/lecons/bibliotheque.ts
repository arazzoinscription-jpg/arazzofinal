/**
 * « Les leçons » : toutes les leçons des cours en UNE liste, pour composer un nouveau cours en les cochant.
 * Règles pures (testées) — la lecture en base et la création vivent dans src/app/formateur/lecons.
 */

export interface LeconBrute {
  id: string;
  titre: string | null;
  video_url_bunny: string | null;
  duree_minutes: number | null;
  ordre: number | null;
  devoir?: string | null;
  devoir_obligatoire?: boolean | null;
  created_at?: string | null;
}
export interface CoursBrut {
  id: string;
  titre_fr: string | null;
  published: boolean | null;
  ordre: number | null;
  chapters: { id: string; titre: string | null; ordre: number | null; lessons: LeconBrute[] | null }[] | null;
}

export interface LeconBiblio {
  id: string;
  titre: string;
  video: string | null;
  duree: number | null;
  miniature: string | null;
  coursId: string;
  coursTitre: string;
  coursPublie: boolean;
  chapitre: string;
  creeLe: string | null;
  devoir: string;
  devoirObligatoire: boolean;
}

const parOrdre = <T extends { ordre: number | null }>(a: T, b: T) => (a.ordre ?? 9999) - (b.ordre ?? 9999);

/** Bibliothèque Bunny et identifiant d'une vidéo de leçon (URL embed / play, ou code HTML de l'iframe). */
export function videoBunny(video: string | null | undefined): { bibliotheque: string; id: string } | null {
  const m = (video ?? "").match(/mediadelivery\.net\/(?:embed|play)\/(\d+)\/([\w-]+)/i);
  return m ? { bibliotheque: m[1], id: m[2] } : null;
}

/** Image de la vidéo — seulement pour la bibliothèque « cours » dont on connaît l'adresse des fichiers. */
export function miniatureDe(video: string | null | undefined, bibliotheque: string, pullZone: string): string | null {
  const v = videoBunny(video);
  if (!v || !bibliotheque || !pullZone || v.bibliotheque !== bibliotheque) return null;
  return `${pullZone.replace(/\/$/, "")}/${v.id}/thumbnail.jpg`;
}

/** Toutes les leçons, dans l'ordre du parcours : cours (1 → 12, sans ordre à la fin), puis chapitres, puis leçons. */
export function aplatirLecons(cours: CoursBrut[], miniature: (video: string | null) => string | null = () => null): LeconBiblio[] {
  return [...cours].sort(parOrdre).flatMap((c) =>
    [...(c.chapters ?? [])].sort(parOrdre).flatMap((ch) =>
      [...(ch.lessons ?? [])].sort(parOrdre).map((l) => ({
        id: l.id,
        titre: (l.titre ?? "").trim() || "Leçon sans titre",
        video: (l.video_url_bunny ?? "").trim() || null,
        duree: l.duree_minutes ?? null,
        miniature: miniature((l.video_url_bunny ?? "").trim() || null),
        coursId: c.id,
        coursTitre: (c.titre_fr ?? "").trim() || "Cours sans titre",
        coursPublie: !!c.published,
        chapitre: (ch.titre ?? "").trim(),
        creeLe: l.created_at ?? null,
        devoir: (l.devoir ?? "").trim(),
        devoirObligatoire: !!l.devoir_obligatoire,
      }))));
}

/** Les leçons créées dernièrement d'abord (sans date : à la fin, dans l'ordre du parcours). */
export function plusRecentes(lecons: LeconBiblio[]): LeconBiblio[] {
  return lecons.map((l, i) => ({ l, i }))
    .sort((a, b) => (b.l.creeLe ?? "").localeCompare(a.l.creeLe ?? "") || a.i - b.i)
    .map((x) => x.l);
}

/** Cocher avec Maj : toute la plage entre la dernière ligne cochée et celle-ci prend l'état de cette ligne. */
export function cocherPlage(selection: string[], ids: string[], depuis: number | null, jusqua: number): string[] {
  const id = ids[jusqua];
  const oui = !selection.includes(id);
  const plage = depuis === null ? [id] : ids.slice(Math.min(depuis, jusqua), Math.max(depuis, jusqua) + 1);
  return oui ? [...selection, ...plage.filter((x) => !selection.includes(x))] : selection.filter((x) => !plage.includes(x));
}

const plat = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/\p{M}+/gu, "").toLowerCase().trim();

/** Recherche sans accents (titre de la leçon, du cours ou du chapitre), filtre par cours, vidéo obligatoire ou non. */
export function filtrerLecons(lecons: LeconBiblio[], f: { recherche?: string; coursId?: string; avecVideo?: boolean }): LeconBiblio[] {
  const mots = plat(f.recherche).split(/\s+/).filter(Boolean);
  return lecons.filter((l) => {
    if (f.coursId && l.coursId !== f.coursId) return false;
    if (f.avecVideo && !l.video) return false;
    const texte = plat(`${l.titre} ${l.coursTitre} ${l.chapitre}`);
    return mots.every((m) => texte.includes(m));
  });
}

/** Adresse du nouveau cours : son titre sans accents + un suffixe unique. */
export function slugDeCours(titre: string, suffixe: string): string {
  const base = plat(titre).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
  return `${base || "cours"}-${suffixe}`;
}

/**
 * La COPIE d'une leçon dans le nouveau cours : même titre, même vidéo (aucune vidéo dupliquée sur Bunny), même
 * devoir (écrit à part, voir l'action). La leçon d'origine ne bouge pas : ses élèves, leur progression et leurs
 * travaux restent dans son cours.
 */
export function copieDeLecon(source: LeconBrute, chapitreId: string, ordre: number) {
  return {
    chapter_id: chapitreId,
    titre: (source.titre ?? "").trim() || "Leçon sans titre",
    video_url_bunny: (source.video_url_bunny ?? "").trim() || null,
    duree_minutes: source.duree_minutes ?? null,
    ordre,
    is_preview: false,
  };
}
