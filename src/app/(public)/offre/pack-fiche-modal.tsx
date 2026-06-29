"use client";

import { useEffect, useState } from "react";
import { X, ChevronDown, PlayCircle, Lock, BookOpen, BarChart3, Loader2, CheckCircle2, CalendarClock } from "lucide-react";
import { getPackFiche } from "@/app/actions/rejoindre";
import type { Lang } from "./offre-i18n";

type Lesson = { titre: string; duree: number | null };
type Chapter = { titre: string; lessons: Lesson[] };
type FicheCourse = { slug: string | null; title: string; niveau: string | null; thumbnail: string | null; chapters: Chapter[]; chaptersCount: number; lessonsTotal: number };
type Fiche = { titre: string; prixDzd: number; prixEur: number; durationMonths: number | null; courses: FicheCourse[]; lessonsTotal: number };

const T = {
  fr: { close: "Fermer", loading: "Chargement…", notfound: "Pack introuvable.", contains: "Formations incluses",
    chapters: "chapitres", lessons: "leçons", min: "min", choose: "Choisir ce pack", months: "mois",
    levels: { debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé" } as Record<string, string> },
  ar: { close: "إغلاق", loading: "جارٍ التحميل…", notfound: "الحزمة غير موجودة.", contains: "الدورات المشمولة",
    chapters: "محاور", lessons: "دروس", min: "د", choose: "اختاري هذه الحزمة", months: "أشهر",
    levels: { debutant: "مبتدئ", intermediaire: "متوسط", avance: "متقدم" } as Record<string, string> },
  en: { close: "Close", loading: "Loading…", notfound: "Pack not found.", contains: "Included courses",
    chapters: "chapters", lessons: "lessons", min: "min", choose: "Choose this pack", months: "months",
    levels: { debutant: "Beginner", intermediaire: "Intermediate", avance: "Advanced" } as Record<string, string> },
} as const;

/** Popup détaillant un pack (formations → chapitres → leçons) sans quitter /offre. */
export function PackFicheModal({
  packId, lang, onClose, onChoose, fmt,
}: {
  packId: string | null;
  lang: Lang;
  onClose: () => void;
  onChoose: (packId: string) => void;
  fmt: (n: number) => string;
}) {
  const t = T[lang];
  const [loading, setLoading] = useState(true);
  const [fiche, setFiche] = useState<Fiche | false | null>(null);

  useEffect(() => {
    if (!packId) return;
    setLoading(true); setFiche(null);
    getPackFiche(packId).then((res) => { setLoading(false); setFiche(res.ok ? (res.fiche as Fiche) : false); });
  }, [packId]);

  useEffect(() => {
    document.body.style.overflow = packId ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [packId]);

  if (!packId) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-violet-950/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[92dvh] bg-cream-DEFAULT dark:bg-[#120d24] sm:rounded-3xl rounded-t-3xl overflow-hidden flex flex-col shadow-2xl">
        {/* En-tête */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-cream-200 dark:border-white/10 bg-white dark:bg-[#15102b]">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-violet-600 dark:text-violet-300">📦 Pack</p>
            <h2 className="font-playfair text-lg font-bold text-gray-900 dark:text-white truncate">{fiche ? fiche.titre : "…"}</h2>
          </div>
          <button onClick={onClose} aria-label={t.close}
            className="w-9 h-9 grid place-items-center rounded-full bg-cream-100 dark:bg-white/10 text-gray-500 dark:text-white/70 hover:bg-cream-200 shrink-0"><X size={18} /></button>
        </div>

        {/* Corps défilant */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-gray-400"><Loader2 size={20} className="animate-spin" /> {t.loading}</div>
          ) : fiche === false || !fiche ? (
            <p className="text-center py-16 text-gray-400">{t.notfound}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-gray-500 dark:text-white/60 font-dm mb-5">
                <span className="inline-flex items-center gap-1.5"><BookOpen size={15} /> {fiche.courses.length} {t.contains.toLowerCase()}</span>
                <span className="inline-flex items-center gap-1.5"><PlayCircle size={15} /> {fiche.lessonsTotal} {t.lessons}</span>
                {fiche.durationMonths && <span className="inline-flex items-center gap-1.5"><CalendarClock size={15} /> {fiche.durationMonths} {t.months}</span>}
                <span className="ms-auto font-bold text-orange-600">{fmt(fiche.prixDzd)}</span>
              </div>

              <div className="space-y-5">
                {fiche.courses.map((c, ci) => (
                  <div key={ci} className="bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 overflow-hidden">
                    <div className="flex gap-3 p-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-cream-100 dark:bg-white/5 flex-shrink-0">
                        {c.thumbnail ? <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-2xl">🎓</div>}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white leading-snug line-clamp-2">{c.title}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-500 dark:text-white/50 font-dm">
                          {c.niveau && <span className="inline-flex items-center gap-1"><BarChart3 size={12} /> {t.levels[c.niveau] ?? c.niveau}</span>}
                          <span>{c.chaptersCount} {t.chapters}</span>
                          <span>{c.lessonsTotal} {t.lessons}</span>
                        </div>
                      </div>
                    </div>

                    {/* Programme : chapitres → leçons (accordéon) */}
                    <div className="border-t border-cream-100 dark:border-white/10 divide-y divide-cream-100 dark:divide-white/5">
                      {c.chapters.map((ch, chi) => (
                        <details key={chi} className="group" open={ci === 0 && chi === 0}>
                          <summary className="flex items-center justify-between gap-2 cursor-pointer px-4 py-3 list-none hover:bg-cream-50 dark:hover:bg-white/[0.03]">
                            <span className="flex items-center gap-2.5 font-semibold text-sm text-gray-800 dark:text-white/90 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-xs grid place-items-center flex-shrink-0">{chi + 1}</span>
                              <span className="truncate">{ch.titre}</span>
                            </span>
                            <span className="flex items-center gap-2 text-xs text-gray-400 shrink-0">
                              {ch.lessons.length}
                              <ChevronDown size={15} className="group-open:rotate-180 transition-transform" />
                            </span>
                          </summary>
                          <ul className="pb-2">
                            {ch.lessons.map((l, li) => (
                              <li key={li} className="flex items-center justify-between gap-2 ps-12 pe-4 py-1.5 text-sm text-gray-600 dark:text-white/60">
                                <span className="flex items-center gap-2 min-w-0">
                                  <Lock size={12} className="text-gray-300 dark:text-white/30 flex-shrink-0" />
                                  <span className="truncate">{l.titre}</span>
                                </span>
                                {l.duree != null && <span className="text-xs text-gray-400 shrink-0">{l.duree} {t.min}</span>}
                              </li>
                            ))}
                          </ul>
                        </details>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Pied : choisir ce pack */}
        {fiche && (
          <div className="px-5 py-3.5 border-t border-cream-200 dark:border-white/10 bg-white dark:bg-[#15102b]">
            <button onClick={() => { onChoose(packId); onClose(); }}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-DEFAULT to-orange-500 text-white font-bold py-3 rounded-xl shadow-glow hover:brightness-105 transition-all">
              <CheckCircle2 size={18} /> {t.choose}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
