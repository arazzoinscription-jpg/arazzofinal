import Link from "next/link";
import {
  PlayCircle, BarChart3, Check, FileText, Award,
  Infinity as InfinityIcon, ShieldCheck, GraduationCap, ChevronRight,
} from "lucide-react";
import type { Lang } from "@/lib/store-i18n";

/** Détails d'un pack (produit 'bundle') affichés sur la fiche produit boutique. */
export interface PackInfo {
  totalDzd: number;
  packDzd: number;
  categories: string[];
  courses: {
    slug: string | null;
    title: string;
    niveau: string | null;
    thumbnail: string | null;
    lessons: number;
    chapters: number;
    program?: string[];
  }[];
}

const T = {
  fr: {
    contains: (n: number) => `Ce pack contient ${n} formation${n > 1 ? "s" : ""}`,
    intro: "Accédez à toutes ces formations en une seule fois, à tarif avantageux.",
    lessons: (n: number) => `${n} leçon${n > 1 ? "s" : ""}`, chapters: (n: number) => `${n} chapitre${n > 1 ? "s" : ""}`,
    see: "Voir la formation", included: "Ce pack inclut", program: "Programme",
    lifetime: "Accès à vie à toutes les formations", certificate: "Certificat pour chaque formation",
    patterns: "Patrons PDF inclus", secure: "Paiement sécurisé",
    allLessons: (n: number) => `${n} leçons vidéo HD au total`,
    value: "Valeur cumulée", save: "vous économisez",
    levels: { debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé" } as Record<string, string>,
  },
  ar: {
    contains: (n: number) => `تحتوي هذه الحزمة على ${n} دورة`,
    intro: "ادخلي إلى كل هذه الدورات دفعة واحدة بسعر مميّز.",
    lessons: (n: number) => `${n} درس`, chapters: (n: number) => `${n} محور`,
    see: "عرض الدورة", included: "تشمل هذه الحزمة", program: "البرنامج",
    lifetime: "وصول مدى الحياة لكل الدورات", certificate: "شهادة لكل دورة",
    patterns: "باترونات PDF مرفقة", secure: "دفع آمن",
    allLessons: (n: number) => `${n} درس فيديو HD إجمالاً`,
    value: "القيمة الإجمالية", save: "توفّرين",
    levels: { debutant: "مبتدئ", intermediaire: "متوسط", avance: "متقدم" } as Record<string, string>,
  },
  en: {
    contains: (n: number) => `This pack includes ${n} course${n > 1 ? "s" : ""}`,
    intro: "Get all these courses at once, at a discounted price.",
    lessons: (n: number) => `${n} lesson${n > 1 ? "s" : ""}`, chapters: (n: number) => `${n} chapter${n > 1 ? "s" : ""}`,
    see: "View course", included: "This pack includes", program: "Curriculum",
    lifetime: "Lifetime access to all courses", certificate: "Certificate for each course",
    patterns: "PDF patterns included", secure: "Secure payment",
    allLessons: (n: number) => `${n} HD video lessons in total`,
    value: "Cumulative value", save: "you save",
    levels: { debutant: "Beginner", intermediaire: "Intermediate", avance: "Advanced" } as Record<string, string>,
  },
} satisfies Record<Lang, any>;

export function PackInfoSection({ pack, lang = "fr" }: { pack: PackInfo; lang?: Lang }) {
  const t = T[lang];
  if (!pack.courses.length) return null;

  const totalLessons = pack.courses.reduce((s, c) => s + c.lessons, 0);
  const saving = pack.totalDzd - pack.packDzd;
  const card = "bg-white dark:bg-white/[0.04] rounded-3xl p-6 sm:p-7 border border-cream-200 dark:border-white/10 shadow-soft";
  const heading = "font-playfair text-2xl font-bold text-gray-900 dark:text-white";

  return (
    <section className="mt-12 space-y-6">
      {/* Catégories */}
      {pack.categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {pack.categories.map((c, i) => (
            <span key={i} className="text-xs font-semibold bg-violet-50 dark:bg-violet-500/15 text-violet-700 dark:text-violet-300 px-3 py-1 rounded-full">🏷️ {c}</span>
          ))}
        </div>
      )}

      {/* Formations incluses */}
      <div className={card}>
        <h2 className={`${heading} mb-1`}>{t.contains(pack.courses.length)}</h2>
        <p className="text-gray-500 dark:text-white/50 font-dm mb-5">{t.intro}</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {pack.courses.map((c, i) => {
            const inner = (
              <>
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-cream-100 dark:bg-white/5 flex-shrink-0">
                  {c.thumbnail
                    ? <img src={c.thumbnail} alt={c.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><GraduationCap size={24} className="text-violet-400" /></div>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug">{c.title}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs text-gray-500 dark:text-white/50 font-dm">
                    {c.niveau && <span className="inline-flex items-center gap-1"><BarChart3 size={12} /> {t.levels[c.niveau] ?? c.niveau}</span>}
                    <span className="inline-flex items-center gap-1"><PlayCircle size={12} /> {t.lessons(c.lessons)}</span>
                    <span className="inline-flex items-center gap-1"><FileText size={12} /> {t.chapters(c.chapters)}</span>
                  </div>
                  {c.program && c.program.length > 0 && (
                    <div className="mt-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 dark:text-white/40 mb-1">{t.program}</p>
                      <ul className="space-y-1">
                        {c.program.slice(0, 8).map((ch, j) => (
                          <li key={j} className="flex items-start gap-1.5 text-xs text-gray-600 dark:text-white/60 font-dm">
                            <Check size={12} className="text-orange-DEFAULT flex-shrink-0 mt-0.5" /> <span className="line-clamp-1">{ch}</span>
                          </li>
                        ))}
                        {c.program.length > 8 && (
                          <li className="text-xs text-gray-400 dark:text-white/40 ps-4">+{c.program.length - 8}…</li>
                        )}
                      </ul>
                    </div>
                  )}
                  {c.slug && (
                    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-orange-600 dark:text-orange-300 mt-2">
                      {t.see} <ChevronRight size={13} className="rtl:rotate-180" />
                    </span>
                  )}
                </div>
              </>
            );
            const cls = "flex gap-4 rounded-2xl border border-cream-200 dark:border-white/10 p-3 transition-colors";
            return c.slug ? (
              <Link key={i} href={`/formations/${c.slug}`} className={`${cls} hover:border-orange-300 dark:hover:border-orange-400/50 hover:bg-cream-50/50 dark:hover:bg-white/[0.06]`}>
                {inner}
              </Link>
            ) : (
              <div key={i} className={cls}>{inner}</div>
            );
          })}
        </div>
      </div>

      {/* Ce pack inclut */}
      <div className={card}>
        <h2 className={`${heading} mb-5`}>{t.included}</h2>
        <ul className="grid sm:grid-cols-2 gap-3 text-sm font-dm">
          {[
            { Icon: GraduationCap, label: t.contains(pack.courses.length) },
            { Icon: PlayCircle, label: t.allLessons(totalLessons) },
            { Icon: InfinityIcon, label: t.lifetime },
            { Icon: FileText, label: t.patterns },
            { Icon: Award, label: t.certificate },
            { Icon: ShieldCheck, label: t.secure },
          ].map(({ Icon, label }) => (
            <li key={label} className="flex items-start gap-3 text-gray-700 dark:text-white/70">
              <Icon size={18} className="text-violet-DEFAULT dark:text-violet-300 flex-shrink-0 mt-0.5" />
              {label}
            </li>
          ))}
        </ul>

        {saving > 0 && (
          <div className="mt-5 pt-5 border-t border-cream-100 dark:border-white/10 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-dm">
            <span className="text-gray-500 dark:text-white/50">{t.value} :</span>
            <span className="line-through text-gray-400 dark:text-white/40">{pack.totalDzd.toLocaleString("fr-DZ")} DA</span>
            <span className="inline-flex items-center gap-1 font-bold text-green-600 dark:text-green-400">
              <Check size={15} /> {t.save} {saving.toLocaleString("fr-DZ")} DA
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
