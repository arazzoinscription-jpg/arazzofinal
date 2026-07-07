"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Ruler, Scissors, FileText, ArrowUpRight, PackageOpen, SlidersHorizontal } from "lucide-react";
import { GENRES, TYPES, type Genre, type TypeVetement, type Lang } from "@/lib/patron-categories";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe";

export interface PatronItem {
  id: string;
  titre: string;
  prixDzd: number;
  prixEur: number;
  preview: string | null;
  formateur: string | null;
  tailles: string | null;
  tissu: string | null;
  nbPages: number | null;
  genre: Genre | null;
  type: TypeVetement | null;
}

const UI = {
  fr: { shopBy: "Acheter par catégorie", all: "Tout", filters: "Filtres", results: (n: number) => `${n} patron${n > 1 ? "s" : ""}`, empty: "Aucun patron dans cette sélection.", reset: "Réinitialiser les filtres", by: "par", buy: "Voir le patron", pages: "p.", gender: "Genre", garment: "Type de vêtement" },
  ar: { shopBy: "تسوّقي حسب الفئة", all: "الكل", filters: "تصفية", results: (n: number) => `${n} باترون`, empty: "لا يوجد باترون في هذا الاختيار.", reset: "إعادة ضبط", by: "بواسطة", buy: "عرض الباترون", pages: "ص", gender: "الفئة", garment: "نوع اللباس" },
  en: { shopBy: "Shop by category", all: "All", filters: "Filters", results: (n: number) => `${n} pattern${n > 1 ? "s" : ""}`, empty: "No patterns in this selection.", reset: "Reset filters", by: "by", buy: "View pattern", pages: "p.", gender: "Gender", garment: "Garment" },
} as const;

/** Dégradé de marque par type (repli visuel derrière l'image de catégorie). */
const TYPE_GRADIENT: Record<TypeVetement, string> = {
  robe: "from-blush-400 to-blush-600",
  jupe: "from-orange-400 to-orange-600",
  pantalon: "from-violet-500 to-violet-700",
  haut: "from-teal-500 to-teal-700",
  veste: "from-violet-700 to-[#2a1245]",
  ensemble: "from-blush-500 to-violet-600",
  traditionnel: "from-orange-500 to-violet-700",
  accessoire: "from-teal-400 to-blush-500",
};

export function PatronsShop({ items, lang }: { items: PatronItem[]; lang: Lang }) {
  const t = UI[lang];
  const reduce = useReducedMotionSafe();
  const [genre, setGenre] = useState<Genre | "">("");
  const [type, setType] = useState<TypeVetement | "">("");

  const filtered = useMemo(
    () => items.filter((p) => (!genre || p.genre === genre) && (!type || p.type === type)),
    [items, genre, type],
  );

  // Compteurs contextuels : nombre de patrons par genre / par type (selon l'autre filtre actif).
  const genreCount = (g: Genre) => items.filter((p) => p.genre === g && (!type || p.type === type)).length;
  const typeCount = (ty: TypeVetement) => items.filter((p) => p.type === ty && (!genre || p.genre === genre)).length;

  const grid: Variants = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.04 } } };
  const card: Variants = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 18 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
    exit: reduce ? { opacity: 0 } : { opacity: 0, y: -10, transition: { duration: 0.2 } },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* ── Acheter par catégorie : vitrine de types avec image ── */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-5">
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-orange-600 dark:text-orange-400">Le rayon</span>
          <span className="h-px w-10 bg-violet-950/25 dark:bg-white/25" />
          <span className="text-[11px] sm:text-xs font-dm font-semibold uppercase tracking-[0.2em] text-violet-950/60 dark:text-white/55">{t.shopBy}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {TYPES.map((ty) => {
            const active = type === ty.slug;
            const n = typeCount(ty.slug);
            return (
              <button key={ty.slug} onClick={() => setType(active ? "" : ty.slug)}
                aria-pressed={active}
                className={`group relative overflow-hidden rounded-[1.4rem] ring-1 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  active ? "ring-2 ring-orange-500 shadow-glow -translate-y-0.5" : "ring-violet-950/10 dark:ring-white/10 hover:-translate-y-1 hover:shadow-soft"
                }`}>
                <div className={`relative aspect-[4/5] bg-gradient-to-br ${TYPE_GRADIENT[ty.slug]}`}>
                  {/* Image de catégorie (Higgsfield) — repli sur le dégradé si absente. */}
                  <img
                    src={`/images/categories/${ty.slug}.jpg`}
                    alt=""
                    loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                  <span className="absolute top-2.5 end-2.5 inline-flex items-center rounded-full bg-white/25 backdrop-blur px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">{n}</span>
                  <div className="absolute inset-x-0 bottom-0 p-3 text-start">
                    <span className="block font-playfair text-base sm:text-lg font-bold text-white leading-tight drop-shadow">{ty.label[lang]}</span>
                  </div>
                  {active && <span aria-hidden className="absolute inset-0 ring-2 ring-inset ring-orange-400 rounded-[1.4rem]" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Barre de filtres : Genre (segmenté) + reset ── */}
      <div className="sticky top-[calc(env(safe-area-inset-top)+0.5rem)] z-10 mb-8">
        <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-white/85 dark:bg-[#15102b]/85 backdrop-blur-md ring-1 ring-violet-950/10 dark:ring-white/10 px-3 py-2.5 shadow-soft">
          <span className="inline-flex items-center gap-1.5 font-dm text-xs font-semibold uppercase tracking-wide text-violet-950/60 dark:text-white/55 ps-1">
            <SlidersHorizontal size={14} className="text-orange-500" /> {t.gender}
          </span>
          <div className="flex flex-wrap gap-1.5">
            <FilterPill active={genre === ""} onClick={() => setGenre("")} label={t.all} />
            {GENRES.map((g) => {
              const n = genreCount(g.slug);
              return (
                <FilterPill key={g.slug} active={genre === g.slug} disabled={n === 0}
                  onClick={() => setGenre(genre === g.slug ? "" : g.slug)}
                  label={<><span className="me-1">{g.emoji}</span>{g.label[lang]}<span className="ms-1.5 text-[10px] opacity-60 tabular-nums">{n}</span></>} />
              );
            })}
          </div>
          <div className="flex-1" />
          <span className="font-mono text-xs text-violet-950/50 dark:text-white/45 tabular-nums pe-1">{t.results(filtered.length)}</span>
          {(genre || type) && (
            <button onClick={() => { setGenre(""); setType(""); }}
              className="font-dm text-xs font-semibold text-orange-600 dark:text-orange-300 hover:underline">
              {t.reset}
            </button>
          )}
        </div>
      </div>

      {/* ── Grille de patrons (animée) ── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center text-center py-24 text-violet-950/55 dark:text-white/45">
          <PackageOpen size={48} strokeWidth={1.5} className="mb-4 text-cream-300 dark:text-white/20" />
          <p className="text-xl font-dm">{t.empty}</p>
          <button onClick={() => { setGenre(""); setType(""); }} className="mt-4 text-orange-600 dark:text-orange-300 font-semibold hover:underline">{t.reset}</button>
        </div>
      ) : (
        <motion.div variants={grid} initial="hidden" animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 sm:gap-6">
          <AnimatePresence mode="popLayout">
            {filtered.map((patron, i) => (
              <motion.div key={patron.id} layout variants={card} initial="hidden" animate="show" exit="exit"
                className="group relative bg-white dark:bg-white/[0.04] rounded-2xl ring-1 ring-violet-950/[0.08] dark:ring-white/10 overflow-hidden shadow-[0_14px_34px_-22px_rgba(43,18,69,0.3)] hover:shadow-[0_26px_52px_-24px_rgba(43,18,69,0.45)] hover:-translate-y-1 transition-shadow duration-300">
                <a href={`/patrons/${patron.id}`} className="block">
                  <div className="relative aspect-[4/5] bg-cream-50 dark:bg-white/5 overflow-hidden flex items-center justify-center">
                    <img src={patron.preview || `/images/categories/${patron.type ?? "robe"}.jpg`} alt={patron.titre} loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <span className="absolute top-3 start-3 font-mono text-[10px] tracking-[0.2em] uppercase bg-cream-DEFAULT/90 dark:bg-[#0d0a1c]/80 text-violet-950 dark:text-white px-2 py-1 rounded-md ring-1 ring-violet-950/10 dark:ring-white/15 backdrop-blur-sm">
                      N° {String(i + 1).padStart(2, "0")}
                    </span>
                    {patron.type && (
                      <span className="absolute bottom-3 start-3 font-dm text-[11px] font-semibold bg-white/90 dark:bg-[#15102b]/90 text-violet-900 dark:text-white px-2.5 py-1 rounded-full ring-1 ring-violet-950/10 dark:ring-white/15 backdrop-blur-sm">
                        {TYPES.find((x) => x.slug === patron.type)?.label[lang]}
                      </span>
                    )}
                  </div>
                </a>
                <div className="p-5">
                  <h3 className="font-playfair text-lg font-bold text-violet-950 dark:text-white leading-snug line-clamp-2">{patron.titre}</h3>
                  {patron.formateur && (
                    <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-violet-950/45 dark:text-white/40 mt-1.5">{t.by} {patron.formateur}</p>
                  )}
                  {(patron.tailles || patron.tissu || patron.nbPages != null) && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {patron.tailles && <span className="inline-flex items-center gap-1 text-[11px] font-dm font-medium bg-cream-100 dark:bg-white/5 text-violet-950/70 dark:text-white/60 px-2 py-1 rounded-lg"><Ruler size={12} className="text-orange-500" /> {patron.tailles}</span>}
                      {patron.tissu && <span className="inline-flex items-center gap-1 text-[11px] font-dm font-medium bg-cream-100 dark:bg-white/5 text-violet-950/70 dark:text-white/60 px-2 py-1 rounded-lg line-clamp-1 max-w-full"><Scissors size={12} className="text-orange-500" /> {patron.tissu}</span>}
                      {patron.nbPages != null && <span className="inline-flex items-center gap-1 text-[11px] font-dm font-medium bg-cream-100 dark:bg-white/5 text-violet-950/70 dark:text-white/60 px-2 py-1 rounded-lg"><FileText size={12} className="text-orange-500" /> {patron.nbPages} {t.pages}</span>}
                    </div>
                  )}
                  <div className="flex items-end justify-between mt-4 pt-4 border-t border-violet-950/[0.08] dark:border-white/10">
                    <span className="font-playfair text-xl font-bold text-violet-950 dark:text-white tabular-nums">{patron.prixDzd.toLocaleString("fr-DZ")} DA</span>
                    <span className="font-mono text-xs text-violet-950/40 dark:text-white/40">{patron.prixEur}€</span>
                  </div>
                  <a href={`/patrons/${patron.id}`}
                    className="group/cta flex items-center justify-center gap-2 w-full mt-4 bg-violet-950 dark:bg-orange-DEFAULT text-white py-2.5 rounded-xl font-semibold hover:bg-orange-DEFAULT dark:hover:bg-orange-600 transition-colors text-sm">
                    {t.buy}
                    <ArrowUpRight size={15} className="group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5 transition-transform rtl:-scale-x-100" />
                  </a>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

function FilterPill({ active, disabled, onClick, label }: { active: boolean; disabled?: boolean; onClick: () => void; label: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-pressed={active}
      className={`inline-flex items-center px-3 py-1.5 rounded-xl text-sm font-semibold font-dm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:opacity-35 disabled:cursor-not-allowed ${
        active
          ? "bg-violet-950 dark:bg-orange-DEFAULT text-white shadow-md"
          : "bg-white dark:bg-white/[0.05] text-violet-950/70 dark:text-white/70 ring-1 ring-violet-950/12 dark:ring-white/10 hover:ring-orange-400 hover:text-orange-600 dark:hover:text-orange-300"
      }`}>
      {label}
    </button>
  );
}
