import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import {
  Star, Clock, PlayCircle, BarChart3, Check, Lock, ChevronDown,
  ShieldCheck, Award, FileText, Infinity as InfinityIcon, ChevronRight,
  GraduationCap, MapPin, Sparkles, Quote,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Reveal } from "@/components/ui/reveal";
import { createPublicClient } from "@/lib/supabase/public";
import { normLang, isRtl, type Lang } from "@/lib/store-i18n";
import { BuyButton } from "./buy-button";
import { EnrollRequestButton } from "@/components/enrollment/enroll-request-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const supabase = createPublicClient();
  const { data } = await supabase.from("courses").select("titre_fr, description_fr").eq("slug", params.slug).single();
  return {
    title: data ? `${data.titre_fr} — Arazzo Formation` : "Formation",
    description: data?.description_fr,
  };
}

const T = {
  fr: {
    crumb: "Formations", about: "À propos de cette formation", learn: "Ce que vous allez apprendre",
    program: "Programme", reviews: "Avis des élèves", instructor: "Votre formatrice", preview: "Aperçu gratuit",
    lessons: (n: number) => `${n} leçon${n > 1 ? "s" : ""}`, reviewsN: (n: number) => `${n} avis`, min: "min",
    included: "Cette formation inclut", lifetime: "Accès à vie", certificate: "Certificat de réussite",
    patterns: "Patrons PDF inclus", hd: (n: number) => `${n} leçons vidéo HD`,
    secure: "Paiement sécurisé · CCP / BaridiMob / Stripe", chapters: "chapitres",
    viewShop: "Voir sur la boutique", access: "Accéder au cours", soon: "Bientôt en boutique",
    levels: { debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé" } as Record<string, string>,
  },
  ar: {
    crumb: "الدورات", about: "عن هذه الدورة", learn: "ماذا ستتعلّمين",
    program: "البرنامج", reviews: "آراء الطالبات", instructor: "مدرّبتك", preview: "معاينة مجانية",
    lessons: (n: number) => `${n} درس`, reviewsN: (n: number) => `${n} رأي`, min: "د",
    included: "تشمل هذه الدورة", lifetime: "وصول مدى الحياة", certificate: "شهادة إتمام",
    patterns: "باترونات PDF مرفقة", hd: (n: number) => `${n} درس فيديو HD`,
    secure: "دفع آمن · CCP / بريدي موب / Stripe", chapters: "محاور",
    viewShop: "اشتري من المتجر", access: "ادخلي إلى الدورة", soon: "قريباً في المتجر",
    levels: { debutant: "مبتدئ", intermediaire: "متوسط", avance: "متقدم" } as Record<string, string>,
  },
  en: {
    crumb: "Courses", about: "About this course", learn: "What you'll learn",
    program: "Curriculum", reviews: "Student reviews", instructor: "Your instructor", preview: "Free preview",
    lessons: (n: number) => `${n} lesson${n > 1 ? "s" : ""}`, reviewsN: (n: number) => `${n} reviews`, min: "min",
    included: "This course includes", lifetime: "Lifetime access", certificate: "Certificate of completion",
    patterns: "PDF patterns included", hd: (n: number) => `${n} HD video lessons`,
    secure: "Secure payment · CCP / BaridiMob / Stripe", chapters: "chapters",
    viewShop: "View on the shop", access: "Go to the course", soon: "Coming soon to the shop",
    levels: { debutant: "Beginner", intermediaire: "Intermediate", avance: "Advanced" } as Record<string, string>,
  },
} satisfies Record<Lang, any>;

export default async function CourseDetailPage({ params }: { params: { slug: string } }) {
  const supabase = createPublicClient();
  const lang = normLang((await cookies()).get("lang")?.value);
  const t = T[lang];
  const rtl = isRtl(lang);

  const { data: course } = await supabase
    .from("courses")
    .select(`*,
      formateur:users(nom, avatar_url, ville),
      chapters(*, lessons(id, titre, duree_minutes, ordre, is_preview)),
      reviews(note, commentaire, created_at, user:users(nom))`)
    .eq("slug", params.slug)
    .eq("published", true)
    .single();

  if (!course) notFound();

  // Produit boutique correspondant à ce cours (pour rediriger l'achat vers la boutique)
  const { data: prod } = await supabase
    .from("products").select("slug").eq("course_id", course.id).eq("is_active", true).limit(1);
  const productSlug: string | null = (prod?.[0] as any)?.slug ?? null;

  const chapters = ((course.chapters as any[]) ?? []).sort((a, b) => a.ordre - b.ordre);
  const totalLessons = chapters.reduce((acc, c) => acc + (c.lessons?.length ?? 0), 0);
  const reviews = (course.reviews as any[]) ?? [];
  const avgRating = reviews.length ? reviews.reduce((s, r) => s + r.note, 0) / reviews.length : null;
  const formateur = course.formateur as any;
  const hasPreview = chapters.some((c) => (c.lessons ?? []).some((l: any) => l.is_preview));

  const title = lang === "ar" ? course.titre_ar || course.titre_fr
    : lang === "en" ? course.titre_en || course.titre_fr
    : course.titre_fr;
  const accentTitle = lang === "ar" ? null : course.titre_ar;
  const description = lang === "ar" ? course.description_ar || course.description_fr
    : lang === "en" ? course.description_en || course.description_fr
    : course.description_fr;
  const levelLabel = t.levels[course.niveau] ?? course.niveau;

  return (
    <div dir={rtl ? "rtl" : "ltr"}>
      <Navbar lang={lang} />
      <main className="min-h-screen bg-cream-DEFAULT dark:bg-[#0d0a1c]">
        {/* ── Héro ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-violet-800 via-violet-DEFAULT to-[#2a1245] pt-28 pb-14">
          <div className="absolute -top-20 end-1/4 w-[34rem] h-[34rem] rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 start-0 w-[28rem] h-[28rem] rounded-full bg-violet-500/30 blur-3xl pointer-events-none" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-5 gap-10 items-center">
            {/* Texte */}
            <div className="lg:col-span-3 text-white">
              <nav className="flex items-center gap-1.5 text-sm text-violet-200 mb-4">
                <Link href="/formations" className="hover:text-white">{t.crumb}</Link>
                <ChevronRight size={14} className="opacity-60 rtl:rotate-180" />
                <span className="text-white/90 line-clamp-1">{title}</span>
              </nav>

              <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full mb-4">
                <BarChart3 size={13} /> {levelLabel}
              </span>

              <h1 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">{title}</h1>
              {accentTitle && <p className="text-violet-200 text-xl font-bold mt-2" dir="rtl">{accentTitle}</p>}

              {description && <p className="text-violet-100/90 font-dm mt-4 max-w-2xl line-clamp-3 leading-relaxed">{description}</p>}

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 text-sm font-dm">
                {avgRating && (
                  <span className="inline-flex items-center gap-1.5 text-white">
                    <Star size={15} className="fill-orange-400 text-orange-400" />
                    <strong>{avgRating.toFixed(1)}</strong> <span className="text-violet-200">({t.reviewsN(reviews.length)})</span>
                  </span>
                )}
                {course.duree && <span className="inline-flex items-center gap-1.5 text-violet-100"><Clock size={15} /> {course.duree}</span>}
                <span className="inline-flex items-center gap-1.5 text-violet-100"><PlayCircle size={15} /> {t.lessons(totalLessons)}</span>
                <span className="inline-flex items-center gap-1.5 text-violet-100"><FileText size={15} /> {chapters.length} {t.chapters}</span>
              </div>

              {/* Formatrice */}
              {formateur?.nom && (
                <div className="flex items-center gap-3 mt-6">
                  <span className="w-11 h-11 rounded-full bg-white/15 border border-white/20 flex items-center justify-center overflow-hidden">
                    {formateur.avatar_url
                      ? <img src={formateur.avatar_url} alt={formateur.nom} className="w-full h-full object-cover" />
                      : <GraduationCap size={20} className="text-white" />}
                  </span>
                  <div className="text-sm">
                    <p className="text-violet-200 text-xs">{t.instructor}</p>
                    <p className="text-white font-semibold flex items-center gap-1.5">
                      {formateur.nom}
                      {formateur.ville && <span className="text-violet-200 font-normal inline-flex items-center gap-0.5"><MapPin size={12} /> {formateur.ville}</span>}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Aperçu visuel */}
            <div className="lg:col-span-2">
              <div className="relative rounded-3xl overflow-hidden border-4 border-white/10 shadow-2xl aspect-video bg-violet-950">
                {course.thumbnail
                  ? <img src={course.thumbnail} alt={title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-gradient-to-br from-violet-600 to-orange-500" />}
                <div className="absolute inset-0 bg-violet-950/30 flex items-center justify-center">
                  <span className="w-16 h-16 rounded-full bg-white/90 text-violet-700 flex items-center justify-center shadow-xl">
                    <PlayCircle size={36} />
                  </span>
                </div>
                {hasPreview && (
                  <span className="absolute top-3 start-3 inline-flex items-center gap-1.5 bg-orange-DEFAULT text-white text-xs font-bold px-2.5 py-1 rounded-full">
                    <Sparkles size={12} /> {t.preview}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Contenu ───────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid lg:grid-cols-3 gap-8 lg:gap-10">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ce que vous allez apprendre */}
            {chapters.length > 0 && (
              <Reveal animation="up">
                <div className="bg-white dark:bg-white/[0.04] rounded-3xl p-7 border border-cream-200 dark:border-white/10 shadow-soft">
                  <h2 className="font-playfair text-2xl font-bold text-gray-900 dark:text-white mb-5">{t.learn}</h2>
                  <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
                    {chapters.map((c) => (
                      <div key={c.id} className="flex items-start gap-2.5">
                        <Check size={18} className="text-orange-DEFAULT flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 dark:text-white/70 font-dm text-sm">{c.titre}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Reveal>
            )}

            {/* À propos */}
            {description && (
              <Reveal animation="up" delay={80}>
                <div className="bg-white dark:bg-white/[0.04] rounded-3xl p-7 border border-cream-200 dark:border-white/10 shadow-soft">
                  <h2 className="font-playfair text-2xl font-bold text-gray-900 dark:text-white mb-4">{t.about}</h2>
                  <p className="text-gray-700 dark:text-white/70 font-dm leading-relaxed whitespace-pre-line">{description}</p>
                </div>
              </Reveal>
            )}

            {/* Programme */}
            <Reveal animation="up" delay={120}>
              <div className="bg-white dark:bg-white/[0.04] rounded-3xl p-7 border border-cream-200 dark:border-white/10 shadow-soft">
                <div className="flex items-baseline justify-between mb-5">
                  <h2 className="font-playfair text-2xl font-bold text-gray-900 dark:text-white">{t.program}</h2>
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
                        {((chapter.lessons as any[]) ?? []).sort((a, b) => a.ordre - b.ordre).map((lesson) => (
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
            </Reveal>

            {/* Avis */}
            {reviews.length > 0 && (
              <Reveal animation="up" delay={120}>
                <div className="bg-white dark:bg-white/[0.04] rounded-3xl p-7 border border-cream-200 dark:border-white/10 shadow-soft">
                  <h2 className="font-playfair text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
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
              </Reveal>
            )}
          </div>

          {/* Carte d'achat sticky */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-white dark:bg-white/[0.04] rounded-3xl shadow-glow border border-cream-200 dark:border-white/10 p-6">
              <div className="flex items-baseline gap-2.5 mb-1">
                <span className="text-3xl font-playfair font-bold text-orange-DEFAULT">{course.prix_dzd.toLocaleString("fr-DZ")} DA</span>
                <span className="text-gray-400 dark:text-white/40 font-dm">/ {course.prix_eur}€</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-white/40 font-dm mb-4">{t.secure}</p>

              <BuyButton
                courseId={course.id}
                firstLessonId={chapters[0]?.lessons?.[0]?.id}
                productSlug={productSlug}
                viewLabel={t.viewShop}
                accessLabel={t.access}
                soonLabel={t.soon}
              />

              <div className="mt-3">
                <EnrollRequestButton courseId={course.id} courseTitle={title} variant="card" />
              </div>

              <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-white/40 font-dm mt-6 mb-3">{t.included}</p>
              <ul className="space-y-3 text-sm font-dm">
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
          </div>
        </div>
      </main>
      <Footer lang={lang} />
    </div>
  );
}
