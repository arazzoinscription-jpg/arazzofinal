import {
  Star, Clock, PlayCircle, BarChart3, Check, Lock, ChevronDown,
  ShieldCheck, Award, FileText, Infinity as InfinityIcon,
  GraduationCap, MapPin, Quote,
} from "lucide-react";
import type { Lang } from "@/lib/store-i18n";

/**
 * Détails « fiche formation » affichés sur la fiche produit boutique
 * quand le produit est une formation (products.course_id). Reprend le contenu
 * riche de la page /formations/[slug] : programme, ce qui est inclus, formatrice, avis.
 */
export interface CourseInfo {
  duree: string | null;
  niveau: string | null;
  formateur: { nom: string | null; avatar_url: string | null; ville: string | null } | null;
  chapters: { id: string; titre: string; ordre: number;
    lessons: { id: string; titre: string; duree_minutes: number | null; ordre: number; is_preview: boolean }[] }[];
  reviews: { note: number; commentaire: string | null; user: { nom: string | null } | null }[];
}

const T = {
  fr: {
    learn: "Ce que vous allez apprendre", program: "Programme", reviews: "Avis des élèves",
    instructor: "Votre formatrice", preview: "Aperçu", min: "min", chapters: "chapitres",
    lessons: (n: number) => `${n} leçon${n > 1 ? "s" : ""}`, reviewsN: (n: number) => `${n} avis`,
    included: "Cette formation inclut", lifetime: "Accès à vie", certificate: "Certificat de réussite",
    patterns: "Patrons PDF inclus", hd: (n: number) => `${n} leçons vidéo HD`,
    secure: "Paiement sécurisé",
    levels: { debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé" } as Record<string, string>,
  },
  ar: {
    learn: "ماذا ستتعلّمين", program: "البرنامج", reviews: "آراء الطالبات",
    instructor: "مدرّبتك", preview: "معاينة", min: "د", chapters: "محاور",
    lessons: (n: number) => `${n} درس`, reviewsN: (n: number) => `${n} رأي`,
    included: "تشمل هذه الدورة", lifetime: "وصول مدى الحياة", certificate: "شهادة إتمام",
    patterns: "باترونات PDF مرفقة", hd: (n: number) => `${n} درس فيديو HD`,
    secure: "دفع آمن",
    levels: { debutant: "مبتدئ", intermediaire: "متوسط", avance: "متقدم" } as Record<string, string>,
  },
  en: {
    learn: "What you'll learn", program: "Curriculum", reviews: "Student reviews",
    instructor: "Your instructor", preview: "Preview", min: "min", chapters: "chapters",
    lessons: (n: number) => `${n} lesson${n > 1 ? "s" : ""}`, reviewsN: (n: number) => `${n} reviews`,
    included: "This course includes", lifetime: "Lifetime access", certificate: "Certificate of completion",
    patterns: "PDF patterns included", hd: (n: number) => `${n} HD video lessons`,
    secure: "Secure payment",
    levels: { debutant: "Beginner", intermediaire: "Intermediate", avance: "Advanced" } as Record<string, string>,
  },
} satisfies Record<Lang, any>;

export function FormationInfo({ course, lang = "fr" }: { course: CourseInfo; lang?: Lang }) {
  const t = T[lang];
  const chapters = [...(course.chapters ?? [])].sort((a, b) => a.ordre - b.ordre);
  const totalLessons = chapters.reduce((acc, c) => acc + (c.lessons?.length ?? 0), 0);
  const reviews = course.reviews ?? [];
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.note, 0) / reviews.length : null;
  const formateur = course.formateur;
  const levelLabel = (course.niveau && t.levels[course.niveau]) || course.niveau;

  if (!chapters.length && !reviews.length) return null;

  const card = "bg-white dark:bg-white/[0.04] rounded-3xl p-6 sm:p-7 border border-cream-200 dark:border-white/10 shadow-soft";
  const heading = "font-playfair text-2xl font-bold text-gray-900 dark:text-white";

  return (
    <section className="mt-12 space-y-6">
      {/* Bandeau stats */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-dm text-gray-500 dark:text-white/60">
        {levelLabel && <span className="inline-flex items-center gap-1.5"><BarChart3 size={15} /> {levelLabel}</span>}
        {course.duree && <span className="inline-flex items-center gap-1.5"><Clock size={15} /> {course.duree}</span>}
        <span className="inline-flex items-center gap-1.5"><PlayCircle size={15} /> {t.lessons(totalLessons)}</span>
        <span className="inline-flex items-center gap-1.5"><FileText size={15} /> {chapters.length} {t.chapters}</span>
        {avgRating && (
          <span className="inline-flex items-center gap-1.5 text-gray-700 dark:text-white/80">
            <Star size={15} className="fill-orange-400 text-orange-400" />
            <strong>{avgRating.toFixed(1)}</strong> ({t.reviewsN(reviews.length)})
          </span>
        )}
      </div>

      {/* Ce que vous allez apprendre */}
      {chapters.length > 0 && (
        <div className={card}>
          <h2 className={`${heading} mb-5`}>{t.learn}</h2>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
            {chapters.map((c) => (
              <div key={c.id} className="flex items-start gap-2.5">
                <Check size={18} className="text-orange-DEFAULT flex-shrink-0 mt-0.5" />
                <span className="text-gray-700 dark:text-white/70 font-dm text-sm">{c.titre}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Programme */}
      {chapters.length > 0 && (
        <div className={card}>
          <div className="flex items-baseline justify-between mb-5">
            <h2 className={heading}>{t.program}</h2>
            <span className="text-sm text-gray-400 dark:text-white/40 font-dm">{chapters.length} {t.chapters} · {t.lessons(totalLessons)}</span>
          </div>
          <div className="space-y-3">
            {chapters.map((chapter, ci) => (
              <details key={chapter.id} className="group rounded-2xl border border-cream-200 dark:border-white/10 overflow-hidden" open={ci === 0}>
                <summary className="flex items-center justify-between cursor-pointer py-3.5 px-4 bg-cream-50 dark:bg-white/5 hover:bg-cream-100 dark:hover:bg-white/[0.07] transition-colors list-none">
                  <span className="flex items-center gap-3 font-semibold text-gray-800 dark:text-white">
                    <span className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 text-sm flex items-center justify-center flex-shrink-0">{ci + 1}</span>
                    {chapter.titre}
                  </span>
                  <span className="flex items-center gap-2 text-sm text-gray-400 dark:text-white/40">
                    {chapter.lessons?.length ?? 0}
                    <ChevronDown size={16} className="group-open:rotate-180 transition-transform" />
                  </span>
                </summary>
                <div className="divide-y divide-cream-100 dark:divide-white/5">
                  {[...(chapter.lessons ?? [])].sort((a, b) => a.ordre - b.ordre).map((lesson) => (
                    <div key={lesson.id} className="flex items-center justify-between py-2.5 px-4 ps-6 text-sm">
                      <span className="flex items-center gap-2.5 text-gray-600 dark:text-white/60">
                        {lesson.is_preview
                          ? <PlayCircle size={16} className="text-orange-DEFAULT flex-shrink-0" />
                          : <Lock size={14} className="text-gray-300 dark:text-white/30 flex-shrink-0" />}
                        {lesson.titre}
                        {lesson.is_preview && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-500/15 px-1.5 py-0.5 rounded">{t.preview}</span>}
                      </span>
                      {lesson.duree_minutes && <span className="text-gray-400 dark:text-white/40">{lesson.duree_minutes} {t.min}</span>}
                    </div>
                  ))}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Cette formation inclut */}
      <div className={card}>
        <h2 className={`${heading} mb-5`}>{t.included}</h2>
        <ul className="grid sm:grid-cols-2 gap-3 text-sm font-dm">
          {[
            { Icon: InfinityIcon, label: t.lifetime },
            { Icon: PlayCircle, label: t.hd(totalLessons) },
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
      </div>

      {/* Votre formatrice */}
      {formateur?.nom && (
        <div className={card}>
          <h2 className={`${heading} mb-4`}>{t.instructor}</h2>
          <div className="flex items-center gap-4">
            <span className="w-14 h-14 rounded-full bg-violet-100 dark:bg-violet-500/20 border border-cream-200 dark:border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {formateur.avatar_url
                ? <img src={formateur.avatar_url} alt={formateur.nom} className="w-full h-full object-cover" />
                : <GraduationCap size={24} className="text-violet-600 dark:text-violet-300" />}
            </span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{formateur.nom}</p>
              {formateur.ville && (
                <p className="text-sm text-gray-400 dark:text-white/40 inline-flex items-center gap-1"><MapPin size={13} /> {formateur.ville}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Avis */}
      {reviews.length > 0 && (
        <div className={card}>
          <h2 className={`${heading} mb-6 flex items-center gap-2`}>
            {avgRating && <span className="inline-flex items-center gap-1 text-orange-DEFAULT"><Star size={20} className="fill-orange-400 text-orange-400" /> {avgRating.toFixed(1)}</span>}
            {t.reviews}
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {reviews.slice(0, 6).map((review, i) => (
              <div key={i} className="rounded-2xl bg-cream-50/60 dark:bg-white/[0.03] border border-cream-200 dark:border-white/10 p-4">
                <Quote size={20} className="text-orange-300 dark:text-orange-400/50 mb-2" />
                <p className="text-gray-700 dark:text-white/70 text-sm font-dm leading-relaxed mb-3">{review.commentaire}</p>
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center text-sm font-bold text-orange-600 dark:text-orange-300">
                    {review.user?.nom?.[0] ?? "?"}
                  </span>
                  <div>
                    <p className="font-semibold text-sm text-gray-800 dark:text-white">{review.user?.nom ?? "—"}</p>
                    <p className="text-orange-DEFAULT text-xs tracking-wide">{"★".repeat(review.note)}<span className="text-gray-300 dark:text-white/20">{"★".repeat(5 - review.note)}</span></p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
