"use client";

import { Fragment, useRef, useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe";
import {
  Video, BookOpen, Home, Scissors, Users, HeartHandshake,
  Sparkles, ArrowLeft, ArrowRight, Star, Quote, Upload, CheckCircle2,
  ChevronLeft, ChevronRight, Loader2, UploadCloud, Trophy, Wallet, IdCard,
  Instagram, BadgeCheck, LayoutDashboard, MonitorPlay, Smartphone, GraduationCap,
  X, Check, PlayCircle, Lock, FileText, Award, Infinity as InfinityIcon, ShieldCheck, BarChart3, MapPin,
  CreditCard, CalendarClock, ChevronDown, PencilRuler,
  type LucideIcon,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { AnimatedText } from "@/components/ui/animated-text";
import { PackFicheModal } from "./pack-fiche-modal";
import { OFFRE, type Lang } from "./offre-i18n";
import { createClient } from "@/lib/supabase/client";
import { submitLead, createLeadProofUploadUrl, recordLeadProof, sendPaymentInfo, getCourseFiche, submitDeliveryOrder } from "@/app/actions/rejoindre";
import { monthlyAmount, fullDiscountedAmount } from "@/lib/subscription-plan";

/* ── Types partagés ────────────────────────────────────────────────────── */
export type Level = "debutant" | "intermediaire" | "avance";
export interface CourseOption { id: string; titre: string; niveau: string; prixDzd: number; thumbnail: string | null; slug: string; subscriptionEnabled?: boolean; durationMonths?: number | null; fullDiscount?: boolean; isPack?: boolean; detailSlug?: string | null; }
export interface PayInfo { account_number?: string; account_key?: string; beneficiary_name?: string; rip?: string; }
export interface ModelismeNiveau { name: string; courses: { id: string; titre: string; prixDzd: number; slug: string }[] }
export interface ModelismePack { id: string; titre: string; prixDzd: number; slug: string }
export interface ModelismeGroup { slug: string; title: string; image: string; niveaux: ModelismeNiveau[]; packs?: ModelismePack[] }

const LEVELS: Level[] = ["debutant", "intermediaire", "avance"];
const levelIndex = (n: string) => { const i = LEVELS.indexOf(n as Level); return i < 0 ? 0 : i; };
const WILAYAS = ["Alger", "Oran", "Constantine", "Blida", "Sétif", "Annaba", "Tizi Ouzou", "Béjaïa", "Autre"];

const WHY_ICONS: LucideIcon[] = [Video, BookOpen, Home, Scissors, Users, HeartHandshake];
const WHY_TINT = [
  "from-orange-100 to-orange-50 text-orange-600 dark:from-orange-500/20 dark:to-orange-500/5 dark:text-orange-300",
  "from-violet-100 to-violet-50 text-violet-700 dark:from-violet-500/20 dark:to-violet-500/5 dark:text-violet-300",
  "from-orange-100 to-blush-50 text-orange-600 dark:from-orange-500/20 dark:to-violet-500/5 dark:text-orange-300",
  "from-blush-100 to-orange-50 text-blush-500 dark:from-blush-500/20 dark:to-orange-500/5 dark:text-blush-300",
  "from-violet-100 to-blush-50 text-violet-700 dark:from-violet-500/20 dark:to-blush-500/5 dark:text-violet-300",
  "from-orange-100 to-violet-50 text-orange-600 dark:from-orange-500/20 dark:to-violet-500/5 dark:text-orange-300",
];
const PATH_IMG = ["/images/hero-modelisme-2.jpg", "/images/cours-modelisme11-feminin.jpg", "/images/cours-modelisme-fronces.jpg"];
const PATH_LESSONS = [12, 18, 20];

// Captures réelles de la plateforme (espace connecté) — voir scripts/capture-plateforme.mjs.
const PF = "/images/plateforme";
const PLATFORM_SHOTS: { img: string; kind: "browser" | "phone"; url: string; icon: LucideIcon }[] = [
  { img: `${PF}/dashboard-eleve.webp`, kind: "browser", url: "formation-arazzo.store/dashboard", icon: LayoutDashboard },
  { img: `${PF}/cours-lecon.webp`, kind: "browser", url: "formation-arazzo.store/cours", icon: MonitorPlay },
  { img: `${PF}/feed-communaute.webp`, kind: "phone", url: "communauté", icon: Smartphone },
  { img: `${PF}/formateur.webp`, kind: "browser", url: "formation-arazzo.store/formateur", icon: GraduationCap },
];

// Galerie : créations réelles des élèves (importées depuis la page v0).
const TP = "/images/temoignages";
const GALLERY_IMG = [
  `${TP}/creation-1.jpg`, `${TP}/creation-2.jpg`, `${TP}/creation-3.jpg`,
  `${TP}/creation-4.jpg`, `${TP}/creation-5.jpg`, `${TP}/creation-6.jpg`,
];

// Success story mise en avant + témoignages authentiques (darija) — repris de la page v0.
const SUCCESS = {
  handle: "@maison_mina_luxury",
  followers: "2.4K",
  instagram: "https://www.instagram.com/maison_mina_luxury",
  avatar: `${TP}/mina-avatar.jpg`,
  gallery: [`${TP}/mina-1.jpg`, `${TP}/mina-2.jpg`, `${TP}/mina-3.jpg`],
  quote: "كانت حابة تبدا وماعرفتش منين. اليوم تخيط موديلات رائعة وعندها صفحة وزبائن.",
};
const BRAND_INSTAGRAM = "https://www.instagram.com/arazzo_formation";
const TESTI = [
  { quote: "قبل استاذة كفاه كنت وكفاه، وليت طوّرت من روحي بزاف. انتي مديتيلي لاباز وانا عليّا نفنّن. شكراً على مصداقيتك ربي يجازيك، باذن الله نكمّل معاك المستويات كامل.", avatar: `${TP}/temoin-1.jpg` },
  { quote: "انا خياطة ونعرف نخيط، بصح راني نتفرّج في كل صغيرة وكبيرة وبزاف حوايج تعلّمتها. محظوظات لبنات لي أول مرة يتعلّمو الخياطة عندك، راهم فالمكان الصحيح.", avatar: `${TP}/temoin-2.jpg` },
  { quote: "السلام عليكم استاذة. راني نتفرّج فالفيديوهات تاوعك، ماشاء الله شرحك مبسّط وتهدري على كلش. صعيب تلقاي استاذة تعطيك هاذ الأسرار كامل.", avatar: `${TP}/temoin-1.jpg` },
];

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const reduce = useReducedMotionSafe();
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section
      ref={ref}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

export function SalesPage({ lang = "fr", courses = [], pay = null, preselectCourseId = null, modelismeGroups = [] }: { lang?: Lang; courses?: CourseOption[]; pay?: PayInfo | null; preselectCourseId?: string | null; modelismeGroups?: ModelismeGroup[] }) {
  const t = OFFRE[lang];

  // État partagé Quiz → Parcours → Inscription
  const [recommended, setRecommended] = useState<Level>("debutant");
  const [hasReco, setHasReco] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [phase, setPhase] = useState<"form" | "done">("form");
  const [ficheId, setFicheId] = useState<string | null>(null);
  const [packFicheId, setPackFicheId] = useState<string | null>(null);
  const ficheFmt = (n: number) => `${Number(n).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-DZ")} ${t.inscription.currency}`;

  function pickCourse(level: Level) {
    return courses.find((c) => c.niveau === level) ?? courses[0];
  }
  /** Pré-remplit l'inscription puis défile vers le formulaire. */
  function enroll(level: Level | null, presetCourseId?: string) {
    if (level) { setRecommended(level); setHasReco(true); }
    const cid = presetCourseId ?? pickCourse(level ?? recommended)?.id ?? "";
    if (cid) setCourseId(cid);
    setPhase("form");
    setTimeout(() => document.getElementById("inscription")?.scrollIntoView({ behavior: "smooth" }), 60);
  }

  // Arrivée depuis la boutique (« Réserver ta place ») : pré-sélectionne la formation + défile.
  useEffect(() => {
    if (preselectCourseId && courses.some((c) => c.id === preselectCourseId)) {
      enroll(null, preselectCourseId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectCourseId]);

  return (
    <div className="bg-cream-DEFAULT dark:bg-[#0b0818] text-gray-900 dark:text-white overflow-x-hidden">
      <Navbar lang={lang} solid />
      <Hero lang={lang} />
      {/* Choisir sa formation : 3 parcours Modélisme (Femme / Homme / Enfants). */}
      {modelismeGroups.length > 0 && (
        <ModelismeFormations lang={lang} groups={modelismeGroups} onEnroll={(cid) => enroll(null, cid)} />
      )}
      {/* Repli si la taxonomie Modélisme n'est pas configurée : cartes « parcours ». */}
      {modelismeGroups.length === 0 && (
        <Paths lang={lang} courses={courses} onEnroll={(cid) => enroll(null, cid)} onFiche={setFicheId} onPackFiche={setPackFicheId} />
      )}
      {/* Réserver sa place (inscription + paiement). */}
      {courses.length > 0 && (
        <Inscription
          lang={lang} courses={courses} pay={pay}
          recommended={recommended} hasReco={hasReco}
          courseId={courseId} setCourseId={setCourseId}
          phase={phase} setPhase={setPhase}
          onFiche={setFicheId}
        />
      )}
      <Why lang={lang} />
      <Quiz lang={lang} courses={courses} onEnroll={(lvl) => enroll(lvl)} />
      <Testimonials lang={lang} />
      <DiplomaSection lang={lang} />
      <PaymentMethodsSection lang={lang} />
      <FinalCta lang={lang} />

      <CourseFicheModal courseId={ficheId} lang={lang} onClose={() => setFicheId(null)} onEnroll={(cid) => enroll(null, cid)} fmt={ficheFmt} />
      {/* Popup détail du pack (niv 1 + niv 2) — accessible depuis « Choisis ton parcours ». */}
      <PackFicheModal packId={packFicheId} lang={lang} onClose={() => setPackFicheId(null)}
        onChoose={(pid) => { setCourseId(pid); setTimeout(() => document.getElementById("inscription")?.scrollIntoView({ behavior: "smooth" }), 60); }} fmt={ficheFmt} />

      <footer className="border-t border-cream-200 dark:border-white/10 py-8 text-center text-sm text-gray-400 dark:text-white/40 font-dm">
        © {new Date().getFullYear()} Arazzo Formation — {t.hero.eyebrow}
      </footer>
    </div>
  );
}

/* ── Organisation Modélisme : 3 cartes Femme / Homme / Enfants ───────────── */
const MODELISME_T = {
  fr: { badge: "Modélisme", title: "3 parcours, pour qui créez-vous ?", sub: "Choisissez votre spécialité — femme, homme ou enfants — puis découvrez les niveaux disponibles.", levels: (n: number) => `${n} niveau${n > 1 ? "x" : ""} en vente`, soon: "Bientôt disponible", see: "Voir les niveaux", enroll: "S'inscrire", from: "" },
  ar: { badge: "المودلیزم", title: "3 مسارات، لمن تصمّمين؟", sub: "اختاري تخصّصك — نساء، رجال أو أطفال — ثم اكتشفي المستويات المتاحة.", levels: (n: number) => `${n} مستوى متاح`, soon: "قريبًا", see: "عرض المستويات", enroll: "سجّلي", from: "" },
  en: { badge: "Patternmaking", title: "3 tracks — who are you creating for?", sub: "Pick your specialty — women, men or children — then explore the available levels.", levels: (n: number) => `${n} level${n > 1 ? "s" : ""} on sale`, soon: "Coming soon", see: "See levels", enroll: "Enroll", from: "" },
} as const;

function ModelismeFormations({ lang, groups, onEnroll }: { lang: Lang; groups: ModelismeGroup[]; onEnroll: (courseId: string) => void }) {
  const t = MODELISME_T[lang] ?? MODELISME_T.fr;
  const [active, setActive] = useState<string | null>(null);
  const fmt = (n: number) => `${Number(n).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-DZ")} DA`;

  return (
    <Section className="bg-cream-DEFAULT dark:bg-[#0b0818]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-orange-600 dark:text-orange-400 mb-3">
            <PencilRuler size={15} /> {t.badge}
          </span>
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold text-violet-950 dark:text-white">{t.title}</h2>
          <p className="text-violet-950/60 dark:text-white/60 font-dm mt-3 max-w-xl mx-auto">{t.sub}</p>
        </div>

        {/* 3 cartes — compactes ; le détail s'ouvre JUSTE SOUS la carte cliquée. */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-5">
          {groups.map((g) => {
            const nb = g.niveaux.length;
            const nbPacks = g.packs?.length ?? 0;
            const hasContent = nb > 0 || nbPacks > 0;
            const label = nb > 0 ? t.levels(nb) : nbPacks > 0 ? `${nbPacks} pack${nbPacks > 1 ? "s" : ""}` : t.soon;
            const isActive = active === g.slug;
            return (
              <Fragment key={g.slug}>
                <button
                  onClick={() => setActive(isActive ? null : g.slug)}
                  aria-expanded={isActive}
                  className={`group text-start rounded-2xl overflow-hidden bg-white dark:bg-white/[0.04] ring-1 transition-all duration-300 flex flex-row sm:flex-col ${
                    isActive ? "ring-2 ring-orange-DEFAULT shadow-xl" : "ring-violet-950/10 dark:ring-white/10 hover:shadow-lg hover:-translate-y-0.5"
                  }`}
                >
                  <div className="relative w-28 h-28 sm:w-full sm:h-auto sm:aspect-[16/10] shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.image} alt={g.title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    <div aria-hidden className="hidden sm:block absolute inset-0 bg-gradient-to-t from-violet-950/45 to-transparent" />
                  </div>
                  <div className="flex-1 min-w-0 p-3.5 sm:p-4 flex flex-col justify-center">
                    <h3 className="font-playfair text-lg sm:text-xl font-bold text-violet-950 dark:text-white leading-tight">{g.title}</h3>
                    <p className={`text-xs font-dm mt-0.5 ${hasContent ? "text-orange-600 dark:text-orange-400 font-semibold" : "text-violet-950/45 dark:text-white/45"}`}>
                      {label}
                    </p>
                    <span className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${isActive ? "text-orange-600 dark:text-orange-400" : "text-violet-700 dark:text-violet-300"}`}>
                      {t.see} <ChevronDown size={14} className={`transition-transform ${isActive ? "rotate-180" : ""}`} />
                    </span>
                  </div>
                </button>

                {/* Détail de CETTE catégorie — pleine largeur, directement sous la carte cliquée */}
                <AnimatePresence initial={false}>
                  {isActive && (
                    <motion.div key={`panel-${g.slug}`} className="sm:col-span-3 overflow-hidden"
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}>
                      <div className="rounded-3xl border border-violet-950/10 dark:border-white/10 bg-white dark:bg-white/[0.04] p-5 sm:p-7">
                        <h3 className="font-playfair text-2xl font-bold text-violet-950 dark:text-white mb-5 flex items-center gap-2">
                          <GraduationCap size={22} className="text-orange-DEFAULT" /> {g.title}
                        </h3>
                        {g.niveaux.length === 0 && !(g.packs && g.packs.length) ? (
                          <p className="text-violet-950/60 dark:text-white/60 font-dm py-6 text-center">{t.soon} ✂️</p>
                        ) : (
                          <div className="space-y-6">
                            {g.niveaux.map((n) => (
                              <div key={n.name}>
                                <div className="flex items-center gap-3 mb-3">
                                  <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-orange-600 dark:text-orange-400 whitespace-nowrap">{n.name}</span>
                                  <span className="h-px flex-1 bg-violet-950/10 dark:bg-white/10" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {n.courses.map((c) => (
                                    <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl border border-violet-950/10 dark:border-white/10 bg-cream-50 dark:bg-white/[0.03] p-4">
                                      <div className="min-w-0">
                                        <p className="font-semibold text-violet-950 dark:text-white truncate">{c.titre}</p>
                                        {c.prixDzd > 0 && <p className="text-sm text-orange-600 dark:text-orange-400 font-dm mt-0.5">{fmt(c.prixDzd)}</p>}
                                      </div>
                                      <button onClick={() => onEnroll(c.id)}
                                        className="shrink-0 inline-flex items-center gap-1.5 bg-orange-DEFAULT text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors">
                                        {t.enroll} <ArrowRight size={15} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}

                            {/* Packs de formation rangés dans cette catégorie */}
                            {g.packs && g.packs.length > 0 && (
                              <div>
                                <div className="flex items-center gap-3 mb-3">
                                  <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-violet-700 dark:text-violet-300 whitespace-nowrap">📦 Packs de formation</span>
                                  <span className="h-px flex-1 bg-violet-950/10 dark:bg-white/10" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {g.packs.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-2xl border border-violet-300/60 dark:border-violet-500/30 bg-violet-50/60 dark:bg-violet-500/10 p-4">
                                      <div className="min-w-0">
                                        <p className="font-semibold text-violet-950 dark:text-white truncate">{p.titre}</p>
                                        {p.prixDzd > 0 && <p className="text-sm text-violet-700 dark:text-violet-300 font-dm mt-0.5">{fmt(p.prixDzd)}</p>}
                                      </div>
                                      <button onClick={() => onEnroll(p.id)}
                                        className="shrink-0 inline-flex items-center gap-1.5 bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-violet-800 transition-colors">
                                        {t.enroll} <ArrowRight size={15} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Fragment>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

/* ── Héro ──────────────────────────────────────────────────────────────── */
function Hero({ lang }: { lang: Lang }) {
  const t = OFFRE[lang].hero;
  const reduce = useReducedMotionSafe();
  return (
    <section className="relative pt-12 pb-16 sm:pt-16 sm:pb-24 overflow-hidden">
      <div className="absolute -top-24 start-1/4 w-[36rem] h-[36rem] rounded-full bg-violet-200/40 dark:bg-violet-700/20 blur-3xl pointer-events-none" />
      <div className="absolute top-20 end-0 w-[28rem] h-[28rem] rounded-full bg-orange-200/40 dark:bg-orange-700/15 blur-3xl pointer-events-none" />
      <Scissors className="absolute top-32 end-10 text-orange-300/60 rotate-12 hidden lg:block" size={40} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        {/* Carte formatrice */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, type: "spring", stiffness: 120, damping: 16 }}
          className="relative order-2 lg:order-1 mx-auto w-full max-w-md"
        >
          <div className="absolute -inset-3 bg-gradient-to-tr from-violet-500/40 via-blush-300/30 to-orange-400/40 rounded-[2.2rem] blur-2xl" />
          <div className="relative rounded-[2rem] overflow-hidden border-4 border-white dark:border-white/10 shadow-2xl aspect-[4/5]">
            <img src="/images/fondatrice.png" alt={t.instructorName} loading="eager" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-violet-950/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 start-4 end-4 bg-white/90 dark:bg-black/50 backdrop-blur-md rounded-2xl px-4 py-3 border border-white/40">
              <p className="font-playfair font-bold text-gray-900 dark:text-white">{t.instructorName}</p>
              <p className="text-xs text-gray-500 dark:text-white/60 font-dm">{t.instructorRole}</p>
            </div>
          </div>
        </motion.div>

        {/* Texte */}
        <div className="order-1 lg:order-2 text-center lg:text-start">
          <span className="inline-flex items-center gap-2 text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-500/10 border border-orange-200/70 dark:border-orange-500/20 px-3.5 py-1.5 rounded-full text-xs font-bold font-dm">
            <Sparkles size={14} /> {t.eyebrow}
          </span>
          <h1 className="font-playfair text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] mt-5">
            {t.title1}<br />
            <span className="text-violet-DEFAULT dark:text-violet-300">{t.titleHi}</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-700 dark:text-white/80 font-dm font-semibold mt-5">{t.sub}</p>
          <p className="text-gray-500 dark:text-white/55 font-dm mt-2 max-w-lg mx-auto lg:mx-0">{t.desc}</p>

          <div className="flex flex-col sm:flex-row gap-3 mt-7 justify-center lg:justify-start">
            <a href="#inscription" className="group inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white px-7 py-3.5 rounded-2xl font-bold text-lg shadow-glow hover:bg-orange-600 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 font-dm">
              {t.ctaPrimary}
              <ArrowLeft size={20} className="rtl:rotate-0 ltr:rotate-180 group-hover:-translate-x-1 transition-transform" />
            </a>
            <Link href="/formations" className="inline-flex items-center justify-center gap-2 border-2 border-violet-DEFAULT text-violet-700 dark:text-violet-300 dark:border-violet-400 px-7 py-3.5 rounded-2xl font-semibold text-lg hover:bg-violet-50 dark:hover:bg-violet-500/10 active:scale-[0.98] transition-all duration-200 font-dm">
              {t.ctaSecondary}
            </Link>
          </div>

          <div className="flex flex-wrap gap-2.5 mt-7 justify-center lg:justify-start">
            {t.chips.map((c) => (
              <span key={c} className="inline-flex items-center gap-2 bg-white dark:bg-white/5 border border-cream-200 dark:border-white/10 rounded-full px-3.5 py-1.5 text-sm font-dm text-gray-700 dark:text-white/70 shadow-soft">
                <Scissors size={13} className="text-orange-DEFAULT" /> {c}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Pourquoi nous (6 atouts) ──────────────────────────────────────────── */
function Why({ lang }: { lang: Lang }) {
  const t = OFFRE[lang].why;
  return (
    <Section className="py-20 sm:py-24 bg-white dark:bg-[#120d24]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold">{t.title}</h2>
          <p className="text-gray-500 dark:text-white/50 font-dm mt-3 text-lg">{t.sub}</p>
        </div>
        {/* Bento : tuile vedette + trio + bandeau pleine largeur (rythme + diversité de fond) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {t.cards.map((c, i) => {
            const Icon = WHY_ICONS[i];
            const featured = i === 0;
            const band = i === t.cards.length - 1;

            if (featured) {
              return (
                <div key={c.t} className="group relative overflow-hidden rounded-3xl sm:col-span-2 p-7 sm:p-9 bg-gradient-to-br from-violet-700 via-violet-600 to-orange-500 text-white shadow-glow flex flex-col justify-end min-h-[18rem]">
                  {/* Vidéo de fond (réalisation atelier) */}
                  <video autoPlay muted loop playsInline preload="metadata"
                    poster="/videos/offre-couture.jpg"
                    className="absolute inset-0 w-full h-full object-cover">
                    <source src="/videos/offre-couture.mp4" type="video/mp4" />
                  </video>
                  <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-black/10" />
                  <div aria-hidden className="absolute -top-10 -end-10 w-44 h-44 rounded-full bg-white/15 blur-2xl pointer-events-none" />
                  <span className="relative w-14 h-14 rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    <Icon size={28} strokeWidth={1.75} />
                  </span>
                  <h3 className="relative font-playfair text-2xl sm:text-3xl font-bold mb-2">{c.t}</h3>
                  <p className="relative text-white/90 font-dm leading-relaxed max-w-md">{c.d}</p>
                </div>
              );
            }
            if (band) {
              return (
                <div key={c.t} className="group sm:col-span-2 lg:col-span-3 rounded-3xl bg-gradient-to-r from-orange-50 to-violet-50 dark:from-orange-500/10 dark:to-violet-500/10 border border-cream-200 dark:border-white/10 p-6 sm:p-8 flex items-center gap-5 hover:shadow-glow transition-all duration-300">
                  <span className={`shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center group-hover:scale-110 transition-transform ${WHY_TINT[i]}`}>
                    <Icon size={26} strokeWidth={1.75} />
                  </span>
                  <div>
                    <h3 className="font-playfair text-xl font-bold mb-1">{c.t}</h3>
                    <p className="text-sm text-gray-500 dark:text-white/50 font-dm leading-relaxed">{c.d}</p>
                  </div>
                </div>
              );
            }
            return (
              <div key={c.t} className="group rounded-3xl bg-cream-50/60 dark:bg-white/[0.03] border border-cream-200 dark:border-white/10 p-6 hover:shadow-glow hover:-translate-y-1 transition-all duration-300">
                <span className={`w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-5 group-hover:scale-110 transition-transform ${WHY_TINT[i]}`}>
                  <Icon size={26} strokeWidth={1.75} />
                </span>
                <h3 className="font-playfair text-xl font-bold mb-1.5">{c.t}</h3>
                <p className="text-sm text-gray-500 dark:text-white/50 font-dm leading-relaxed">{c.d}</p>
              </div>
            );
          })}
        </div>
      </div>
    </Section>
  );
}

/* ── À l'intérieur de la plateforme (captures réelles) ─────────────────── */
function BrowserFrame({ src, url, alt }: { src: string; url: string; alt: string }) {
  return (
    <div className="group relative">
      <div aria-hidden className="absolute -inset-4 rounded-[2rem] bg-gradient-to-tr from-violet-500/25 via-blush-300/15 to-orange-400/25 blur-2xl opacity-70 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative rounded-2xl overflow-hidden border border-cream-200 dark:border-white/10 bg-white dark:bg-[#160f2e] shadow-2xl transition-transform duration-500 will-change-transform group-hover:-translate-y-2">
        <div className="flex items-center gap-2 px-4 h-10 bg-cream-100/80 dark:bg-white/5 border-b border-cream-200 dark:border-white/10">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          <span className="mx-auto -ml-6 truncate max-w-[60%] text-[11px] font-dm text-gray-400 dark:text-white/40 bg-white/70 dark:bg-white/5 rounded-md px-3 py-1" dir="ltr">{url}</span>
        </div>
        <div className="relative overflow-hidden">
          <img src={src} alt={alt} loading="lazy" className="w-full block transition-transform duration-[1.2s] ease-out group-hover:scale-[1.03]" />
          {/* Reflet glissant au survol */}
          <span aria-hidden className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        </div>
      </div>
    </div>
  );
}

function PhoneFrame({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="group relative mx-auto w-[230px] sm:w-[262px]">
      <div aria-hidden className="absolute -inset-4 rounded-[3rem] bg-gradient-to-tr from-violet-500/30 via-blush-300/20 to-orange-400/30 blur-2xl opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative rounded-[2.6rem] border-[8px] border-[#15102b] dark:border-black bg-[#15102b] shadow-2xl overflow-hidden transition-transform duration-500 group-hover:-translate-y-2">
        <div className="absolute top-0 inset-x-0 z-10 flex justify-center pt-2 pointer-events-none">
          <span className="w-20 h-5 rounded-full bg-black/90" />
        </div>
        <img src={src} alt={alt} loading="lazy" className="w-full block rounded-[2rem]" />
      </div>
    </div>
  );
}

interface PlatformSpace { tag: string; name: string; desc: string; points: string[]; }
function PlatformRow({ sp, i }: { sp: PlatformSpace; i: number }) {
  const shot = PLATFORM_SHOTS[i];
  const Icon = shot.icon;
  const imgFirst = i % 2 === 0; // alternance visuel ↔ texte
  const isPhone = shot.kind === "phone";
  const reduce = useReducedMotionSafe();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-110px" });
  const fromX = reduce ? 0 : imgFirst ? -48 : 48;

  return (
    <div ref={ref} className="relative grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      {/* Chiffre éditorial en filigrane */}
      <span aria-hidden className={`pointer-events-none select-none absolute -top-12 start-0 ${imgFirst ? "lg:start-[44%]" : "lg:start-auto lg:end-[44%]"} font-playfair font-bold text-[6rem] sm:text-[9rem] leading-none text-violet-900/[0.05] dark:text-white/[0.045]`}>
        0{i + 1}
      </span>

      {/* Visuel */}
      <motion.div
        initial={{ opacity: 0, x: fromX, y: 24 }}
        animate={inView ? { opacity: 1, x: 0, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className={`relative ${imgFirst ? "lg:order-1" : "lg:order-2"} ${isPhone ? "py-2" : ""}`}
      >
        {/* Pastille flottante */}
        <motion.span
          aria-hidden
          animate={reduce ? {} : { y: [0, -8, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute z-20 ${isPhone ? "-end-2 top-12" : "-end-4 -top-4"} hidden sm:flex items-center justify-center w-12 h-12 rounded-2xl bg-white dark:bg-[#1b1235] shadow-glow border border-cream-200 dark:border-white/10 text-violet-700 dark:text-violet-300`}
        >
          <Icon size={22} strokeWidth={1.9} />
        </motion.span>
        {isPhone ? <PhoneFrame src={shot.img} alt={sp.name} /> : <BrowserFrame src={shot.img} url={shot.url} alt={sp.name} />}
      </motion.div>

      {/* Texte */}
      <div className={`${imgFirst ? "lg:order-2" : "lg:order-1"} text-center lg:text-start`}>
        <motion.span
          initial={{ opacity: 0, y: 12 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-500/10 border border-orange-200/60 dark:border-orange-500/20 px-3 py-1 rounded-full text-[11px] font-bold font-dm uppercase tracking-wider">
          <span className="font-mono">N° 0{i + 1}</span> · {sp.tag}
        </motion.span>
        <motion.h3
          initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55, delay: 0.06 }}
          className="font-playfair text-2xl sm:text-3xl font-bold mt-4 flex items-center gap-3 justify-center lg:justify-start">
          <span className="shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-orange-500 text-white flex items-center justify-center shadow-glow">
            <Icon size={20} strokeWidth={1.9} />
          </span>
          {sp.name}
        </motion.h3>
        <motion.p
          initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.55, delay: 0.13 }}
          className="text-gray-600 dark:text-white/65 font-dm mt-3 leading-relaxed max-w-lg mx-auto lg:mx-0">{sp.desc}</motion.p>
        <ul className="mt-5 space-y-2.5 inline-block text-start">
          {sp.points.map((p, j) => (
            <motion.li key={p}
              initial={{ opacity: 0, x: reduce ? 0 : -12 }} animate={inView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.45, delay: 0.22 + j * 0.1 }}
              className="flex items-start gap-2.5 text-sm sm:text-[15px] font-dm text-gray-700 dark:text-white/75">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5 text-green-500 dark:text-green-400" />
              <span>{p}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Platform({ lang }: { lang: Lang }) {
  const t = OFFRE[lang].platform;
  const rtl = lang === "ar";
  const flowRef = useRef(null);
  const flowInView = useInView(flowRef, { once: true, margin: "-80px" });
  return (
    <Section className="relative py-20 sm:py-28 bg-white dark:bg-[#120d24] overflow-hidden">
      {/* Atmosphère */}
      <div aria-hidden className="absolute -top-24 start-1/3 w-[34rem] h-[34rem] rounded-full bg-violet-200/30 dark:bg-violet-700/15 blur-3xl pointer-events-none" />
      <div aria-hidden className="absolute bottom-0 end-0 w-[26rem] h-[26rem] rounded-full bg-orange-200/30 dark:bg-orange-700/10 blur-3xl pointer-events-none" />
      {/* Grille discrète */}
      <div aria-hidden className="absolute inset-0 text-violet-950 dark:text-white opacity-[0.025] dark:opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)", backgroundSize: "44px 44px" }} />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* En-tête */}
        <div className="text-center max-w-2xl mx-auto mb-16 sm:mb-20">
          <span className="inline-flex items-center gap-2 text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-500/10 border border-violet-200/70 dark:border-violet-500/20 px-3.5 py-1.5 rounded-full text-xs font-bold font-dm tracking-wide uppercase">
            <Sparkles size={14} /> {t.eyebrow}
          </span>
          <h2 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold mt-5 leading-[1.1]">
            {t.title} <span className="italic text-orange-DEFAULT">{t.titleHi}</span>
          </h2>
          <p className="text-gray-500 dark:text-white/55 font-dm mt-4 text-lg">{t.sub}</p>
        </div>

        {/* Espaces — lignes alternées */}
        <div className="space-y-20 sm:space-y-28">
          {t.spaces.map((sp, i) => <PlatformRow key={sp.name} sp={sp} i={i} />)}
        </div>

        {/* Déroulé d'un cours — frise numérotée animée */}
        <div ref={flowRef} className="mt-20 sm:mt-28 relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-violet-50 to-orange-50 dark:from-violet-900/20 dark:to-orange-900/10 border border-cream-200 dark:border-white/10 p-7 sm:p-12">
          <div aria-hidden className="absolute -top-12 -end-12 w-40 h-40 rounded-full bg-orange-300/20 blur-3xl pointer-events-none" />
          <h3 className="relative font-playfair text-2xl sm:text-3xl font-bold text-center">{t.flowTitle}</h3>
          <ol className="relative mt-10 grid gap-7 sm:gap-3 sm:grid-cols-5">
            {t.flow.map((step, i) => (
              <motion.li key={step}
                initial={{ opacity: 0, y: 20 }} animate={flowInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: i * 0.12 }}
                className="relative flex sm:flex-col items-center gap-4 sm:gap-3 sm:text-center">
                <span className="shrink-0 w-11 h-11 rounded-full bg-white dark:bg-white/10 border-2 border-orange-DEFAULT text-orange-DEFAULT font-playfair font-bold text-lg flex items-center justify-center shadow-soft z-10">
                  {i + 1}
                </span>
                {/* Connecteur animé (desktop) */}
                {i < t.flow.length - 1 && (
                  <motion.span aria-hidden
                    initial={{ scaleX: 0 }} animate={flowInView ? { scaleX: 1 } : {}} transition={{ duration: 0.5, delay: i * 0.12 + 0.25, ease: "easeOut" }}
                    className="hidden sm:block absolute top-[22px] start-1/2 origin-left rtl:origin-right w-full h-0.5 bg-gradient-to-r from-orange-DEFAULT/60 to-violet-DEFAULT/40" />
                )}
                <p className="text-sm font-dm text-gray-700 dark:text-white/75 leading-snug">{step}</p>
              </motion.li>
            ))}
          </ol>
        </div>

        {/* CTA + mention captures réelles */}
        <div className="mt-12 text-center">
          <Link href="/communaute"
            className="group inline-flex items-center gap-2.5 bg-orange-DEFAULT text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-glow hover:bg-orange-600 hover:-translate-y-0.5 active:scale-[0.98] transition-all">
            {t.cta}
            {rtl
              ? <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              : <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
          </Link>
          <p className="mt-4 text-xs text-gray-400 dark:text-white/40 font-dm inline-flex items-center gap-1.5">
            <BadgeCheck size={14} className="text-violet-DEFAULT dark:text-violet-300" /> {t.note}
          </p>
        </div>
      </div>
    </Section>
  );
}

/* ── CTA tiktok-couture (feed des réalisations) ───────────────────────── */
const TIKTOK_T = {
  fr: {
    badge: "tiktok-couture",
    title: "Découvre les réalisations de nos élèves !",
    desc: "Vidéos, modèles et travaux de nos couturières, en continu. Entre dans le feed, encourage et inspire-toi.",
    cta: "Rejoindre tiktok-couture",
  },
  ar: {
    badge: "tiktok-couture",
    title: "شوفي واش راهم يصنعو الطالبات! 🎬",
    desc: "فيديوهات الإنجازات و الموديلات تاع طالباتنا على tiktok-couture، يومياً. ادخلي للفيد، شجّعي، و خودي الإلهام.",
    cta: "ادخلي لـ tiktok-couture",
  },
  en: {
    badge: "tiktok-couture",
    title: "See what our students create!",
    desc: "Videos, designs and real work from our seamstresses, non-stop. Jump into the feed, cheer them on and get inspired.",
    cta: "Join tiktok-couture",
  },
} as const;

function TikTokCouture({ lang }: { lang: Lang }) {
  const t = TIKTOK_T[lang];
  const rtl = lang === "ar";
  return (
    <Section className="py-16 sm:py-20 px-4">
      <div className="max-w-5xl mx-auto" dir={rtl ? "rtl" : "ltr"}>
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0b0818] via-violet-800 to-orange-600 p-8 sm:p-14 text-white text-center shadow-2xl">
          <div aria-hidden className="absolute inset-0 opacity-20"
            style={{ backgroundImage: "linear-gradient(to right, rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.18) 1px, transparent 1px)", backgroundSize: "26px 26px" }} />
          <div aria-hidden className="absolute -top-16 start-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-orange-400/30 blur-3xl pointer-events-none" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 text-sm font-bold bg-white/15 border border-white/25 rounded-full px-4 py-1.5 backdrop-blur">
              <Video size={16} /> {t.badge}
            </span>
            <h2 className="mt-5 font-playfair text-3xl sm:text-5xl font-bold leading-tight max-w-3xl mx-auto">{t.title}</h2>
            <p className="mt-4 text-white/85 font-dm text-lg leading-relaxed max-w-xl mx-auto">{t.desc}</p>
            <Link href="/communaute"
              className="mt-8 inline-flex items-center gap-2.5 bg-white text-violet-900 font-bold text-lg px-9 py-4 rounded-2xl hover:bg-white/90 active:scale-[0.98] transition-all shadow-glow">
              🎬 {t.cta} {rtl ? <ArrowRight size={20} className="rotate-180" /> : <ArrowRight size={20} />}
            </Link>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ── Parcours / formations ─────────────────────────────────────────────── */
function Paths({ lang, courses, onEnroll, onFiche, onPackFiche }: { lang: Lang; courses: CourseOption[]; onEnroll: (courseId: string) => void; onFiche: (id: string) => void; onPackFiche: (id: string) => void }) {
  const t = OFFRE[lang].paths;
  const ins = OFFRE[lang].inscription;
  const fmt = (n: number) => `${Number(n).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-DZ")} ${ins.currency}`;
  const packs = courses.filter((c) => c.isPack);
  const detailLabel = lang === "ar" ? "عرض تفاصيل التكوين" : lang === "en" ? "View course details" : "Voir le détail de la formation";

  // Cartes réelles si des formations existent, sinon repli sur le contenu statique.
  // On met en avant 3 formations (une par niveau) pour rester sur « trois parcours clairs » ;
  // toutes les autres restent accessibles via « Voir toutes les formations » et le menu déroulant d'inscription.
  const useReal = courses.length > 0;
  const featured = (() => {
    // On met en avant en priorité les 3 parcours « Niveau 1 / 2 / 3 ».
    const byNiveauTitle = [1, 2, 3]
      .map((n) => courses.find((c) => c.titre.toLowerCase().startsWith(`niveau ${n}`)))
      .filter(Boolean) as CourseOption[];
    if (byNiveauTitle.length === 3) return byNiveauTitle;
    // Repli : une formation par niveau, puis on complète.
    const perLevel = LEVELS.map((lv) => courses.find((c) => c.niveau === lv)).filter(Boolean) as CourseOption[];
    const base = byNiveauTitle.length > 0 ? byNiveauTitle : (perLevel.length > 0 ? perLevel : courses.slice(0, 3));
    const extra = courses.filter((c) => !base.includes(c));
    return [...base, ...extra].slice(0, 3);
  })();
  const items = useReal ? featured : t.cards.map((c, i) => ({ id: String(i), titre: c.name, sub: c.sub, niveau: LEVELS[c.level], prixDzd: 0, thumbnail: null as string | null, slug: "" }));

  return (
    <Section className="py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold">{t.title}</h2>
          <p className="text-gray-500 dark:text-white/50 font-dm mt-3 text-lg">{t.sub}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {items.map((c, i) => {
            const lvl = levelIndex(c.niveau);
            const img = c.thumbnail || PATH_IMG[i % PATH_IMG.length];
            const sub = "sub" in c && (c as { sub?: string }).sub ? (c as { sub?: string }).sub : t.levels[lvl];
            return (
              <div key={c.id} className="group relative rounded-3xl overflow-hidden bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 shadow-soft hover:shadow-glow hover:-translate-y-1 transition-all duration-300 flex flex-col">
                <div className="relative h-52 overflow-hidden">
                  <img src={img} alt={c.titre} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <span className="absolute top-3 start-3 text-[11px] font-bold px-2.5 py-1 rounded-full bg-violet-DEFAULT text-white">{t.levels[lvl]}</span>
                  {i === 0 && (
                    <span className="absolute top-3 end-3 inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-orange-DEFAULT text-white shadow"><Star size={11} className="fill-white" /> {t.popular}</span>
                  )}
                  <span className="absolute bottom-3 end-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 text-gray-800">
                    {useReal && c.prixDzd > 0 ? fmt(c.prixDzd) : t.lessons(PATH_LESSONS[i % PATH_LESSONS.length])}
                  </span>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-playfair text-xl font-bold">{c.titre}</h3>
                  <p className="text-sm text-gray-500 dark:text-white/50 font-dm mt-1">{sub}</p>
                  <div className="flex gap-2 mt-auto pt-5">
                    {useReal && c.id && !/^\d+$/.test(c.id) ? (
                      <button type="button" onClick={() => onFiche(c.id)} className="flex-1 text-center border border-violet-DEFAULT text-violet-700 dark:text-violet-300 py-2.5 rounded-xl font-semibold text-sm hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
                        {t.moreInfo}
                      </button>
                    ) : (
                      <Link href="/formations" className="flex-1 text-center border border-violet-DEFAULT text-violet-700 dark:text-violet-300 py-2.5 rounded-xl font-semibold text-sm hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
                        {t.moreInfo}
                      </Link>
                    )}
                    {useReal ? (
                      <button onClick={() => onEnroll(c.id)} className="flex-1 text-center bg-orange-DEFAULT text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors">
                        {t.enroll}
                      </button>
                    ) : (
                      <a href="#quiz" className="flex-1 text-center bg-orange-DEFAULT text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors">
                        {OFFRE[lang].nav.testLevel}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Pack (niv 1 + niv 2) avec « Voir le détail de la formation » */}
        {packs.length > 0 && (
          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {packs.map((p) => (
              <div key={p.id} className="relative rounded-3xl border-2 border-orange-300/70 bg-gradient-to-br from-orange-50 to-cream-100 dark:from-orange-500/10 dark:to-white/[0.03] p-5 sm:p-6 flex flex-col">
                <span className="inline-flex items-center gap-1 self-start text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-orange-DEFAULT text-white mb-3"><Star size={11} className="fill-white" /> {t.popular}</span>
                <h3 className="font-playfair text-xl font-bold text-violet-950 dark:text-white">{p.titre}</h3>
                {p.prixDzd > 0 && <p className="font-playfair text-2xl font-bold text-orange-600 dark:text-orange-300 mt-1">{fmt(p.prixDzd)}</p>}
                <div className="flex flex-wrap gap-2 mt-5">
                  <button type="button" onClick={() => onPackFiche(p.id)}
                    className="flex-1 min-w-[10rem] text-center border border-violet-DEFAULT text-violet-700 dark:text-violet-300 py-2.5 rounded-xl font-semibold text-sm hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
                    {detailLabel}
                  </button>
                  <button onClick={() => onEnroll(p.id)}
                    className="flex-1 min-w-[8rem] text-center bg-orange-DEFAULT text-white py-2.5 rounded-xl font-semibold text-sm hover:bg-orange-600 transition-colors">
                    {t.enroll}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {useReal && courses.length > featured.length && (
          <div className="text-center mt-10">
            <Link href="/formations" className="inline-flex items-center gap-2 border-2 border-violet-DEFAULT text-violet-700 dark:text-violet-300 dark:border-violet-400 px-7 py-3 rounded-2xl font-semibold hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
              {OFFRE[lang].hero.ctaSecondary}
            </Link>
          </div>
        )}
      </div>
    </Section>
  );
}

/* ── Bandeau test de niveau ────────────────────────────────────────────── */
function TestBand({ lang }: { lang: Lang }) {
  const t = OFFRE[lang].testBand;
  return (
    <Section className="py-8 sm:py-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] bg-gradient-to-br from-violet-100 via-cream-100 to-orange-100 dark:from-violet-900/30 dark:via-white/[0.03] dark:to-orange-900/20 border border-white/60 dark:border-white/10 px-6 sm:px-12 py-12 text-center">
          <h2 className="font-playfair text-2xl sm:text-4xl font-bold">{t.title}</h2>
          <p className="text-gray-600 dark:text-white/60 font-dm mt-3 max-w-xl mx-auto">{t.sub}</p>
          <a href="#quiz" className="inline-flex items-center gap-2 mt-7 bg-orange-DEFAULT text-white px-8 py-3.5 rounded-2xl font-bold text-lg shadow-glow hover:bg-orange-600 hover:-translate-y-0.5 transition-all">
            <Sparkles size={18} /> {t.cta}
          </a>
        </div>
      </div>
    </Section>
  );
}

/* ── Success stories + témoignages ─────────────────────────────────────── */
function Testimonials({ lang }: { lang: Lang }) {
  const t = OFFRE[lang].testi;
  const f = t.featured;
  return (
    <Section className="py-20 sm:py-24 bg-white dark:bg-[#120d24]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold">{t.title}</h2>
          <p className="text-gray-500 dark:text-white/50 font-dm mt-3 text-lg">{t.sub}</p>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-14 max-w-4xl mx-auto">
          {t.stats.map((s) => (
            <div key={s.label} className="rounded-2xl bg-cream-50/60 dark:bg-white/[0.03] border border-cream-200 dark:border-white/10 p-5 text-center">
              <p className="font-playfair text-3xl sm:text-4xl font-bold text-orange-DEFAULT">{s.value}</p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-white/50 font-dm mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Histoire de réussite mise en avant : @maison_mina_luxury */}
        <div className="rounded-[2rem] overflow-hidden border border-cream-200 dark:border-white/10 bg-cream-50/60 dark:bg-white/[0.03] shadow-soft mb-12">
          <div className="grid lg:grid-cols-2">
            {/* Créations de l'élève */}
            <div className="relative grid grid-cols-2 gap-1 p-1 bg-violet-950/5">
              <img src={SUCCESS.gallery[0]} alt={SUCCESS.handle} className="col-span-2 w-full h-56 sm:h-72 object-cover rounded-2xl" />
              <img src={SUCCESS.gallery[1]} alt={SUCCESS.handle} className="w-full h-36 sm:h-44 object-cover rounded-2xl" />
              <img src={SUCCESS.gallery[2]} alt={SUCCESS.handle} className="w-full h-36 sm:h-44 object-cover rounded-2xl" />
              <span className="absolute top-4 start-4 inline-flex items-center gap-1.5 text-[11px] font-extrabold px-3 py-1.5 rounded-full bg-orange-DEFAULT text-white shadow">
                <Trophy size={13} /> {f.badge}
              </span>
            </div>

            {/* Détails + Instagram */}
            <div className="p-6 sm:p-9 flex flex-col justify-center">
              <div className="flex items-center gap-3">
                <img src={SUCCESS.avatar} alt={SUCCESS.handle} className="w-14 h-14 rounded-full object-cover border-2 border-white dark:border-white/20 shadow" />
                <div>
                  <p className="font-bold text-gray-900 dark:text-white flex items-center gap-1.5">{SUCCESS.handle} <BadgeCheck size={16} className="text-violet-DEFAULT dark:text-violet-300" /></p>
                  <p className="text-xs text-gray-500 dark:text-white/50 font-dm">{f.role} · {SUCCESS.followers} {f.followersLabel}</p>
                </div>
              </div>

              <h3 className="font-playfair text-2xl sm:text-3xl font-bold mt-5">{f.transformTitle}</h3>
              <p dir="rtl" className="text-gray-700 dark:text-white/70 font-dm leading-relaxed mt-3 text-right">“{SUCCESS.quote}”</p>
              <p className="text-xs text-violet-700 dark:text-violet-300 font-dm font-semibold mt-3">{f.program}</p>

              <a href={SUCCESS.instagram} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 mt-6 self-start bg-gradient-to-r from-violet-600 via-orange-500 to-orange-DEFAULT text-white px-6 py-3 rounded-2xl font-bold shadow-glow hover:-translate-y-0.5 transition-all">
                <Instagram size={18} /> {f.instagramCta}
              </a>
            </div>
          </div>
        </div>

        {/* Témoignages élèves (darija) */}
        <div className="grid md:grid-cols-3 gap-6">
          {TESTI.map((it, i) => (
            <div key={i} className="rounded-3xl bg-cream-50/60 dark:bg-white/[0.03] border border-cream-200 dark:border-white/10 p-6 flex flex-col">
              <Quote className="text-orange-300 dark:text-orange-400/60" size={28} />
              <div className="flex gap-0.5 my-3">
                {Array.from({ length: 5 }).map((_, j) => <Star key={j} size={16} className="fill-orange-400 text-orange-400" />)}
              </div>
              <p dir="rtl" className="text-gray-700 dark:text-white/70 font-dm leading-relaxed flex-1 text-right">“{it.quote}”</p>
              <div className="mt-5 pt-4 border-t border-cream-200 dark:border-white/10 flex items-center gap-3">
                <img src={it.avatar} alt="" className="w-11 h-11 rounded-full object-cover" />
                <p className="text-sm font-semibold text-violet-700 dark:text-violet-300 font-dm">{t.itemRoles[i]}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Suivre Arazzo sur Instagram */}
        <div className="text-center mt-12">
          <a href={BRAND_INSTAGRAM} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border-2 border-violet-DEFAULT text-violet-700 dark:text-violet-300 dark:border-violet-400 px-7 py-3 rounded-2xl font-semibold hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
            <Instagram size={18} /> {t.followUs}
          </a>
        </div>
      </div>
    </Section>
  );
}

/* ── Galerie créations ─────────────────────────────────────────────────── */
function Gallery({ lang }: { lang: Lang }) {
  const t = OFFRE[lang].gallery;
  return (
    <Section className="py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold text-violet-DEFAULT dark:text-violet-300">
            {t.title}
          </h2>
          <p className="text-gray-500 dark:text-white/50 font-dm mt-3 text-lg">{t.sub}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {GALLERY_IMG.map((src, i) => (
            <div key={i} className={`group relative rounded-2xl overflow-hidden border border-cream-200 dark:border-white/10 ${i % 5 === 0 ? "col-span-2 row-span-2" : ""}`}>
              <img src={src} alt="" className="w-full h-full object-cover aspect-square transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 bg-violet-950/0 group-hover:bg-violet-950/20 transition-colors" />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ── Quiz interactif → recommandation ──────────────────────────────────── */
function Quiz({ lang, courses, onEnroll }: { lang: Lang; courses: CourseOption[]; onEnroll: (level: Level) => void }) {
  const t = OFFRE[lang].quiz;
  const paths = OFFRE[lang].paths;
  const total = t.questions.length;
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>(Array(total).fill(-1));
  const [done, setDone] = useState(false);

  const cur = t.questions[step];
  const pct = Math.round(((done ? total : step) / total) * 100);

  function pick(i: number) {
    const next = [...answers]; next[step] = i; setAnswers(next);
  }
  function advance() {
    if (answers[step] < 0) return;
    if (step < total - 1) setStep(step + 1);
    else setDone(true);
  }
  // Recommandation : moyenne des réponses → niveau 0/1/2
  const score = answers.reduce((s, a) => s + Math.max(0, a), 0);
  const levelIdx = score <= 2 ? 0 : score <= 5 ? 1 : 2;
  const level = LEVELS[levelIdx];
  const recoCourse = courses.find((c) => c.niveau === level);
  const recoName = recoCourse?.titre ?? paths.cards[levelIdx].name;

  return (
    <Section className="py-20 sm:py-24 bg-white dark:bg-[#120d24]">
      <div id="quiz" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="text-center mb-8">
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold">{t.title}</h2>
          <p className="text-gray-500 dark:text-white/50 font-dm mt-2">{t.sub}</p>
        </div>

        <div className="rounded-3xl bg-cream-50/70 dark:bg-white/[0.03] border border-cream-200 dark:border-white/10 p-6 sm:p-8 shadow-soft">
          {/* Progression */}
          <div className="flex items-center justify-between text-sm font-dm text-gray-500 dark:text-white/50 mb-2">
            <span>{pct}%</span>
            <span>{t.q(Math.min(step + 1, total), total)}</span>
          </div>
          <div className="h-2 rounded-full bg-cream-200 dark:bg-white/10 overflow-hidden mb-7">
            <motion.div className="h-full bg-gradient-to-r from-violet-DEFAULT to-orange-500" animate={{ width: `${pct}%` }} transition={{ duration: 0.4 }} />
          </div>

          <AnimatePresence mode="wait">
            {!done ? (
              <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
                <h3 className="font-playfair text-xl sm:text-2xl font-bold mb-5">{cur.q}</h3>
                <div className="space-y-3">
                  {cur.options.map((opt, i) => {
                    const on = answers[step] === i;
                    return (
                      <button key={i} onClick={() => pick(i)}
                        className={`w-full text-start flex items-center gap-3 rounded-2xl border px-4 py-3.5 font-dm transition-all ${
                          on ? "border-orange-DEFAULT bg-orange-50 dark:bg-orange-500/10 text-orange-700 dark:text-orange-200"
                             : "border-cream-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-orange-300"
                        }`}>
                        <span className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${on ? "border-orange-DEFAULT bg-orange-DEFAULT" : "border-gray-300"}`}>
                          {on && <CheckCircle2 size={14} className="text-white" />}
                        </span>
                        {opt}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between mt-7">
                  <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 disabled:opacity-40">
                    <ChevronRight size={16} className="rtl:block ltr:hidden" /><ChevronLeft size={16} className="ltr:block rtl:hidden" /> {t.prev}
                  </button>
                  <button onClick={advance} disabled={answers[step] < 0}
                    className="inline-flex items-center gap-1.5 bg-orange-DEFAULT text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50 transition-colors">
                    {step < total - 1 ? t.next : t.seeResult}
                    <ChevronLeft size={16} className="rtl:block ltr:hidden" /><ChevronRight size={16} className="ltr:block rtl:hidden" />
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div key="result" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-2">
                <span className="inline-flex w-14 h-14 rounded-full bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-300 items-center justify-center mb-4">
                  <CheckCircle2 size={28} />
                </span>
                <p className="text-sm font-bold uppercase tracking-wide text-orange-600 dark:text-orange-300 font-dm">{t.resultTitle}</p>
                <h3 className="font-playfair text-2xl sm:text-3xl font-bold mt-1">{recoName}</h3>
                <p className="text-gray-500 dark:text-white/55 font-dm mt-3 max-w-md mx-auto">{t.resultText}</p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center mt-7">
                  {courses.length > 0 ? (
                    <button onClick={() => onEnroll(level)} className="inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white px-7 py-3 rounded-2xl font-bold shadow-glow hover:bg-orange-600 transition-colors">
                      {t.resultCta}
                    </button>
                  ) : (
                    <Link href="/formations" className="inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white px-7 py-3 rounded-2xl font-bold shadow-glow hover:bg-orange-600 transition-colors">
                      {t.resultCta}
                    </Link>
                  )}
                  <button onClick={() => { setDone(false); setStep(0); setAnswers(Array(total).fill(-1)); }}
                    className="inline-flex items-center justify-center gap-2 border-2 border-cream-200 dark:border-white/15 px-7 py-3 rounded-2xl font-semibold text-gray-600 dark:text-white/70 hover:bg-cream-50 dark:hover:bg-white/5 transition-colors">
                    {t.restart}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Section>
  );
}

const PAY_T = {
  fr: {
    choose: "Comment souhaitez-vous payer ?",
    baridi: "Baridi Mob / Virement", baridiDesc: "Recevez le RIB par email, payez puis envoyez votre preuve.",
    delivery: "Paiement à la livraison", deliveryDesc: "Une fiche d'inscription vous est livrée par transporteur — vous payez à la réception.",
    address: "Adresse de livraison", addressPlaceholder: "Commune, rue, point de repère…",
    submitDelivery: "Confirmer (paiement à la livraison)",
    doneTitle: "Demande enregistrée 🎉", doneSub: "Voici comment ça se passe :",
    steps: [
      "📞 Vous recevez un appel de confirmation.",
      "🏠 Vous choisissez la livraison au bureau ou à domicile.",
      "📦 Le transporteur vous remet une fiche avec un code-barres d'accès.",
      "💵 Vous payez le transporteur → votre accès est activé directement.",
    ],
  },
  ar: {
    choose: "كيفاش تحبي تخلّصي؟",
    baridi: "بريدي موب / تحويل", baridiDesc: "تتوصلي بالـRIB في الإيميل، تخلّصي ثم ترسلي إثبات الدفع.",
    delivery: "الدفع عند الاستلام", deliveryDesc: "تتوصلي بفيشة التسجيل عن طريق شركة التوصيل — تخلّصي عند الاستلام.",
    address: "عنوان التوصيل", addressPlaceholder: "البلدية، الشارع، نقطة بارزة…",
    submitDelivery: "تأكيد (الدفع عند الاستلام)",
    doneTitle: "تم تسجيل طلبك 🎉", doneSub: "هكذا تتم العملية:",
    steps: [
      "📞 تتوصلي بمكالمة تأكيد.",
      "🏠 تختاري التوصيل للمكتب أو للبيت.",
      "📦 شركة التوصيل تسلّمك فيشة فيها كود باركود للدخول.",
      "💵 تخلّصي عامل التوصيل → يتفعّل دخولك مباشرة.",
    ],
  },
  en: {
    choose: "How would you like to pay?",
    baridi: "Baridi Mob / Transfer", baridiDesc: "Get the bank details by email, pay, then send your proof.",
    delivery: "Pay on delivery", deliveryDesc: "A registration sheet is delivered by courier — you pay on receipt.",
    address: "Delivery address", addressPlaceholder: "Town, street, landmark…",
    submitDelivery: "Confirm (pay on delivery)",
    doneTitle: "Request received 🎉", doneSub: "Here's how it works:",
    steps: [
      "📞 You receive a confirmation call.",
      "🏠 You choose office or home delivery.",
      "📦 The courier hands you a sheet with an access barcode.",
      "💵 You pay the courier → your access is activated right away.",
    ],
  },
} as const;

/* ── Inscription (formulaire → paiement → preuve) ──────────────────────── */
function Inscription({
  lang, courses, pay, recommended, hasReco, courseId, setCourseId, phase, setPhase, onFiche,
}: {
  lang: Lang; courses: CourseOption[]; pay: PayInfo | null;
  recommended: Level; hasReco: boolean;
  courseId: string; setCourseId: (v: string) => void;
  phase: "form" | "done"; setPhase: (p: "form" | "done") => void;
  onFiche: (id: string) => void;
}) {
  const t = OFFRE[lang].inscription;
  const fmt = (n: number) => `${Number(n).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-DZ")} ${t.currency}`;
  const levelLabel = (n: string) => t.levelLabels[(n as Level)] ?? n;
  const pt = PAY_T[lang];

  const [form, setForm] = useState({ full_name: "", email: "", phone: "", wilaya: WILAYAS[0], address: "" });
  const [submitting, startSubmit] = useTransition();
  const [formErr, setFormErr] = useState("");
  const [payMethod, setPayMethod] = useState<"baridi" | "delivery">("baridi");
  const [plan, setPlan] = useState<"full" | "installments">("full");
  const [deliveryDone, setDeliveryDone] = useState(false);
  const [packFicheId, setPackFicheId] = useState<string | null>(null);

  // Preuve de paiement
  const [proofEmail, setProofEmail] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const proofRef = useRef<HTMLInputElement>(null);
  const [proofBusy, setProofBusy] = useState(false);
  const [proofMsg, setProofMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [proofOpen, setProofOpen] = useState(false);

  function openProof() {
    setProofOpen(true);
    setTimeout(() => document.getElementById("depot-preuve")?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
  }

  const selectedCourse = courses.find((c) => c.id === courseId);
  const basePrice = selectedCourse?.prixDzd ?? 0;
  const subMonths = selectedCourse?.durationMonths ?? 0;
  const subOn = !!selectedCourse?.subscriptionEnabled && subMonths >= 2;
  const monthlyDzd = subOn ? monthlyAmount(basePrice, subMonths) : 0;
  const fullDiscDzd = subOn ? fullDiscountedAmount(basePrice, subMonths, selectedCourse?.fullDiscount !== false) : 0;
  // Montant dû maintenant : 1ʳᵉ tranche si abonnement, sinon prix (remisé en comptant abonnement).
  const total = !subOn ? basePrice : plan === "installments" ? monthlyDzd : fullDiscDzd;
  const field = "w-full rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm text-violet-950 dark:text-white placeholder:text-violet-950/35 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr("");
    if (!courseId) { setFormErr(t.coursePlaceholder); return; }
    const isPack = selectedCourse?.isPack === true;
    startSubmit(async () => {
      // Les packs ne se vendent pas en livraison (COD) → toujours virement + preuve.
      if (payMethod === "delivery" && !isPack) {
        const res = await submitDeliveryOrder({ full_name: form.full_name, email: form.email, phone: form.phone, wilaya: form.wilaya, address: form.address, courseId });
        if (res.ok) setDeliveryDone(true);
        else setFormErr(res.error ?? t.genericError);
        return;
      }
      const res = isPack
        ? await submitLead({ full_name: form.full_name, email: form.email, phone: form.phone, wilaya: form.wilaya, packId: courseId, plan: subOn ? plan : "full" })
        : await submitLead({ ...form, courseId, level: recommended, plan: subOn ? plan : "full" });
      if (res.ok) { setPhase("done"); setProofEmail((p) => p || form.email); }
      else setFormErr(res.error ?? t.genericError);
    });
  }

  async function sendProof() {
    setProofMsg(null);
    if (!proofEmail.trim()) { setProofMsg({ ok: false, text: t.errProofEmail }); return; }
    if (!proofFile) { setProofMsg({ ok: false, text: t.errProofFile }); return; }
    setProofBusy(true);
    try {
      const ext = (proofFile.name.split(".").pop() || "jpg").toLowerCase();
      const prep = await createLeadProofUploadUrl(proofEmail, ext);
      if (!prep.ok) { setProofMsg({ ok: false, text: prep.error }); setProofBusy(false); return; }
      const supabase = createClient();
      const { error: upErr } = await supabase.storage.from("proofs").uploadToSignedUrl(prep.path, prep.token, proofFile);
      if (upErr) { setProofMsg({ ok: false, text: t.uploadFail + upErr.message }); setProofBusy(false); return; }
      const ft = ext === "png" ? "png" : ext === "pdf" ? "pdf" : "jpg";
      const rec = await recordLeadProof(prep.orderId, prep.path, ft, proofFile.size);
      if (rec.ok) setProofMsg({ ok: true, text: t.proofSuccess });
      else setProofMsg({ ok: false, text: rec.error });
    } catch (e) {
      setProofMsg({ ok: false, text: (e as Error).message });
    } finally {
      setProofBusy(false);
    }
  }

  return (
    <Section className="py-16 sm:py-20">
      <div id="inscription" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 scroll-mt-20">
        <div className="text-center mb-8">
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold">{t.title}</h2>
          <p className="text-gray-500 dark:text-white/50 font-dm mt-2">{t.sub}</p>
        </div>

        {/* Bandeau niveau recommandé */}
        {hasReco && (
          <div className="rounded-2xl bg-gradient-to-br from-[#1b0c3c] via-violet-900 to-[#2a1245] text-white p-6 text-center mb-6">
            <Trophy size={28} className="mx-auto text-orange-300 mb-2" />
            <p className="font-dm text-[11px] tracking-[0.25em] uppercase text-orange-300">{t.yourLevel}</p>
            <p className="font-playfair text-2xl font-bold mt-1">{levelLabel(recommended)}</p>
            <p className="text-violet-200/80 font-dm text-sm mt-2">
              {courses.some((c) => c.niveau === recommended) ? t.recommendBelow : t.recommendOther}
            </p>
          </div>
        )}

        {phase === "done" ? (
          <div className="bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 p-6">
            <div className="text-center mb-4">
              <span className="inline-flex w-14 h-14 rounded-full bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-300 items-center justify-center mb-3">
                <CheckCircle2 size={28} />
              </span>
              <h3 className="font-playfair text-2xl font-bold">{t.doneTitle}</h3>
              <p className="text-gray-500 dark:text-white/55 font-dm text-sm mt-1">{t.doneSub}</p>
            </div>
            <ProofBlock
              lang={lang} pay={pay} total={total} fmt={fmt}
              proofEmail={proofEmail} setProofEmail={setProofEmail}
              proofFile={proofFile} setProofFile={setProofFile} proofRef={proofRef}
              proofBusy={proofBusy} proofMsg={proofMsg} sendProof={sendProof} field={field}
            />
          </div>
        ) : deliveryDone ? (
          <div className="bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 p-6">
            <div className="text-center mb-5">
              <span className="inline-flex w-14 h-14 rounded-full bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-300 items-center justify-center mb-3">
                <CheckCircle2 size={28} />
              </span>
              <h3 className="font-playfair text-2xl font-bold">{pt.doneTitle}</h3>
              <p className="text-gray-500 dark:text-white/55 font-dm text-sm mt-1">{pt.doneSub}</p>
            </div>
            <ol className="space-y-2.5">
              {pt.steps.map((s, i) => (
                <li key={i} className="flex items-start gap-3 bg-cream-50 dark:bg-white/[0.04] rounded-xl px-4 py-3">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-orange-DEFAULT text-white text-xs font-bold grid place-items-center">{i + 1}</span>
                  <span className="text-sm text-gray-700 dark:text-white/80 font-dm">{s}</span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-white/70 mb-2">{t.chooseCourse} *</label>
              {/* 3 formations sur UNE ligne, y compris sur mobile (cartes compactées). */}
              <div className="grid grid-cols-3 gap-2 sm:gap-3">
                {[0, 1, 2].map((i) => {
                  const lv = LEVELS[i];
                  const c = courses.find((x) => x.titre.toLowerCase().startsWith(`niveau ${i + 1}`)) ?? courses.find((x) => x.niveau === lv);
                  if (!c) return null;
                  const selected = courseId === c.id;
                  return (
                    <div key={i} role="button" tabIndex={0} onClick={() => setCourseId(c.id)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCourseId(c.id); } }}
                      className={`cursor-pointer rounded-xl sm:rounded-2xl border-2 p-2.5 sm:p-4 transition-all flex flex-col ${selected ? "border-orange-DEFAULT bg-orange-50 dark:bg-orange-500/10 shadow-glow" : "border-cream-200 dark:border-white/10 hover:border-orange-300"}`}>
                      <div className="flex items-center justify-between mb-1 sm:mb-1.5 gap-1">
                        <span className="text-[9px] sm:text-[11px] font-mono uppercase tracking-wide text-orange-600 leading-tight">{t.levelLabels[lv] ?? `Niveau ${i + 1}`}</span>
                        {selected && <CheckCircle2 size={14} className="text-orange-DEFAULT shrink-0" />}
                      </div>
                      <p className="font-semibold text-xs sm:text-sm text-gray-900 dark:text-white leading-snug line-clamp-2">{c.titre}</p>
                      <p className="font-bold text-orange-600 mt-1 sm:mt-2 text-xs sm:text-sm">{c.prixDzd > 0 ? fmt(c.prixDzd) : ""}</p>
                      <button type="button" onClick={(e) => { e.stopPropagation(); onFiche(c.id); }}
                        className="mt-auto pt-1.5 sm:pt-2 inline-block text-start text-[10px] sm:text-xs font-semibold text-violet-700 dark:text-violet-300 hover:underline leading-tight">
                        {lang === "ar" ? "عرض التكوين ←" : lang === "en" ? "View →" : "Voir →"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Packs de formation proposés en abonnement (sélection séparée) */}
            {courses.some((c) => c.isPack) && (
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-white/70 mb-2">
                  📦 {lang === "ar" ? "حزم التكوين" : lang === "en" ? "Course packs" : "Packs de formation"}
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {courses.filter((c) => c.isPack).map((c) => {
                    const selected = courseId === c.id;
                    return (
                      <div key={c.id} role="button" tabIndex={0} onClick={() => setCourseId(c.id)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCourseId(c.id); } }}
                        className={`cursor-pointer rounded-2xl border-2 p-4 transition-all flex flex-col ${selected ? "border-orange-DEFAULT bg-orange-50 dark:bg-orange-500/10 shadow-glow" : "border-cream-200 dark:border-white/10 hover:border-orange-300"}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-mono uppercase tracking-wide text-violet-600">📦 Pack</span>
                          {selected && <CheckCircle2 size={16} className="text-orange-DEFAULT shrink-0" />}
                        </div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white leading-snug line-clamp-2">{c.titre}</p>
                        <p className="font-bold text-orange-600 mt-2 text-sm">{c.prixDzd > 0 ? fmt(c.prixDzd) : ""}</p>
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); setPackFicheId(c.id); }}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-300 hover:underline">
                          {lang === "ar" ? "عرض تفاصيل التكوين" : lang === "en" ? "View course details" : "Voir le détail de la formation"}
                          <ChevronRight size={13} className="rtl:rotate-180" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Méthode d'inscription — uniquement si la formation est en mode abonnement */}
            {subOn && (
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-white/70 mb-2">{t.planChoose} *</label>
                {/* Cartes de PAIEMENT en VIOLET pour les distinguer des cartes de formation (orange). */}
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setPlan("full")}
                    className={`text-start rounded-2xl border-2 p-4 transition-all ${plan === "full" ? "border-violet-DEFAULT bg-violet-50 dark:bg-violet-500/10 shadow-lg" : "border-violet-200/70 dark:border-white/10 hover:border-violet-400 bg-violet-50/30 dark:bg-white/[0.02]"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide bg-green-100 text-green-700 rounded-full px-2 py-0.5 dark:bg-green-500/15 dark:text-green-300">🎁 {t.planFullBadge}</span>
                      {plan === "full" && <CheckCircle2 size={16} className="text-violet-DEFAULT" />}
                    </div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{t.planFull}</p>
                    <p className="font-bold text-violet-700 dark:text-violet-300 mt-1 text-sm">{fmt(fullDiscDzd)}</p>
                    <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5 leading-snug">{t.planFullHint}</p>
                  </button>
                  <button type="button" onClick={() => setPlan("installments")}
                    className={`text-start rounded-2xl border-2 p-4 transition-all ${plan === "installments" ? "border-violet-DEFAULT bg-violet-50 dark:bg-violet-500/10 shadow-lg" : "border-violet-200/70 dark:border-white/10 hover:border-violet-400 bg-violet-50/30 dark:bg-white/[0.02]"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <Wallet size={18} className="text-violet-600 dark:text-violet-300" />
                      {plan === "installments" && <CheckCircle2 size={16} className="text-violet-DEFAULT" />}
                    </div>
                    <p className="font-semibold text-sm text-gray-900 dark:text-white">{t.planInstallments}</p>
                    <p className="font-bold text-violet-700 dark:text-violet-300 mt-1 text-sm">{fmt(monthlyDzd)} {t.planPerMonth} × {subMonths}</p>
                    <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5 leading-snug">{t.planInstallmentsHint}</p>
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-white/70 mb-1.5">{t.fullName} *</label>
              <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required placeholder={t.fullNamePlaceholder} className={field} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-white/70 mb-1.5">{t.email} *</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder={t.emailPlaceholder} className={field} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-white/70 mb-1.5">{t.phone} *</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required placeholder={t.phonePlaceholder} className={field} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-white/70 mb-1.5">{t.wilaya}</label>
              <select value={form.wilaya} onChange={(e) => setForm({ ...form, wilaya: e.target.value })} className={field}>
                {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
              </select>
            </div>

            {/* Choix du mode de paiement */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-white/70 mb-2">{pt.choose} *</label>
              <div className="grid sm:grid-cols-2 gap-3">
                {([
                  { id: "baridi" as const, icon: Wallet, title: pt.baridi, desc: pt.baridiDesc },
                  { id: "delivery" as const, icon: Home, title: pt.delivery, desc: pt.deliveryDesc },
                ]).map((m) => {
                  const on = payMethod === m.id;
                  return (
                    <button type="button" key={m.id} onClick={() => setPayMethod(m.id)}
                      className={`text-start rounded-2xl border-2 p-4 transition-all ${on ? "border-orange-DEFAULT bg-orange-50 dark:bg-orange-500/10 shadow-glow" : "border-cream-200 dark:border-white/10 hover:border-orange-300"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <m.icon size={18} className="text-violet-600 dark:text-violet-300" />
                        {on && <CheckCircle2 size={16} className="text-orange-DEFAULT" />}
                      </div>
                      <p className="font-semibold text-sm text-gray-900 dark:text-white">{m.title}</p>
                      <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5 leading-snug">{m.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Adresse — uniquement pour la livraison */}
            {payMethod === "delivery" && (
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-white/70 mb-1.5">{pt.address} *</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} required rows={2}
                  placeholder={pt.addressPlaceholder} className={`${field} resize-none`} />
              </div>
            )}

            {formErr && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{formErr}</p>}
            <button type="submit" disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-DEFAULT to-orange-500 text-white py-3.5 rounded-xl font-bold shadow-glow disabled:opacity-60">
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} {payMethod === "delivery" ? pt.submitDelivery : t.submit}
            </button>

            {/* Accès rapide : déjà payé → déposer la preuve (Baridi/virement uniquement) */}
            {payMethod === "baridi" && (
              <button type="button" onClick={openProof}
                className="w-full relative inline-flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-bold animate-pulse hover:bg-green-700 hover:animate-none transition-colors ring-2 ring-green-400/60 ring-offset-2 ring-offset-white dark:ring-offset-[#0b0818]">
                <span className="absolute -top-1.5 -end-1.5 flex h-3.5 w-3.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-green-500" />
                </span>
                <UploadCloud size={18} /> {t.quickProof}
              </button>
            )}
            <p className="text-xs text-gray-400 dark:text-white/40 text-center">{t.noCommitment}</p>
          </form>
        )}

        {/* Déjà inscrite ? (dépôt de preuve) — Baridi/virement uniquement */}
        {phase !== "done" && !deliveryDone && payMethod === "baridi" && (
          <div className="mt-8" id="depot-preuve">
            <details open={proofOpen} onToggle={(e) => setProofOpen((e.currentTarget as HTMLDetailsElement).open)}
              className="bg-white dark:bg-white/[0.04] rounded-2xl border-2 border-cream-200 dark:border-white/10 open:border-green-400 open:shadow-glow p-5 transition-colors">
              <summary className="cursor-pointer font-semibold text-gray-800 dark:text-white font-dm">{t.alreadyTitle}</summary>
              <div className="mt-4">
                <ProofBlock
                  lang={lang} pay={pay} total={null} fmt={fmt}
                  proofEmail={proofEmail} setProofEmail={setProofEmail}
                  proofFile={proofFile} setProofFile={setProofFile} proofRef={proofRef}
                  proofBusy={proofBusy} proofMsg={proofMsg} sendProof={sendProof} field={field}
                />
              </div>
            </details>
          </div>
        )}
      </div>

      {/* Popup détail d'un pack (reste sur /offre) */}
      <PackFicheModal
        packId={packFicheId}
        lang={lang}
        onClose={() => setPackFicheId(null)}
        onChoose={(pid) => { setCourseId(pid); setTimeout(() => document.getElementById("inscription")?.scrollIntoView({ behavior: "smooth" }), 60); }}
        fmt={fmt}
      />
    </Section>
  );
}

interface ProofProps {
  lang: Lang;
  pay: PayInfo | null;
  total: number | null;
  fmt: (n: number) => string;
  proofEmail: string; setProofEmail: (v: string) => void;
  proofFile: File | null; setProofFile: (f: File | null) => void;
  proofRef: React.RefObject<HTMLInputElement>;
  proofBusy: boolean;
  proofMsg: { ok: boolean; text: string } | null;
  sendProof: () => void;
  field: string;
}

function ProofBlock({ lang, pay, total, fmt, proofEmail, setProofEmail, proofFile, setProofFile, proofRef, proofBusy, proofMsg, sendProof, field }: ProofProps) {
  const t = OFFRE[lang].inscription;
  const steps = t.proofSteps(total ? fmt(total) : null);
  const [payBusy, setPayBusy] = useState(false);
  const [payMsg, setPayMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function getPayInfo() {
    if (!proofEmail.trim()) { setPayMsg({ ok: false, text: t.errProofEmail }); return; }
    setPayBusy(true); setPayMsg(null);
    const res = await sendPaymentInfo(proofEmail.trim());
    setPayBusy(false);
    setPayMsg(res.ok ? { ok: true, text: t.payInfoSent } : { ok: false, text: res.error ?? t.uploadFail });
  }

  return (
    <div className="space-y-4">
      <ol className="text-sm text-gray-600 dark:text-white/70 font-dm space-y-1.5 list-decimal ps-5">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>

      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-white/70 mb-1.5">{t.proofEmailLabel}</label>
        <input type="email" value={proofEmail} onChange={(e) => setProofEmail(e.target.value)} placeholder={t.emailPlaceholder} className={field} />
      </div>

      {/* Coordonnées de paiement envoyées par EMAIL (plus affichées en clair sur la page) */}
      <button type="button" onClick={getPayInfo} disabled={payBusy}
        className="w-full inline-flex items-center justify-center gap-2 border-2 border-violet-DEFAULT text-violet-700 dark:text-violet-300 dark:border-violet-400 py-3 rounded-xl font-semibold hover:bg-violet-50 dark:hover:bg-violet-500/10 disabled:opacity-60 transition-colors">
        {payBusy ? <Loader2 size={17} className="animate-spin" /> : <Wallet size={17} />} {t.getPayInfo}
      </button>
      {payMsg && (
        <p className={`text-sm rounded-xl px-4 py-2.5 ${payMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{payMsg.text}</p>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-600 dark:text-white/70 mb-1.5">{t.proofEmailLabel}</label>
        <input type="email" value={proofEmail} onChange={(e) => setProofEmail(e.target.value)} placeholder={t.emailPlaceholder} className={field} />
      </div>
      <div onClick={() => proofRef.current?.click()}
        className="border-2 border-dashed border-cream-300 dark:border-white/15 rounded-xl p-5 text-center cursor-pointer hover:bg-cream-50 dark:hover:bg-white/5 transition-colors">
        <input ref={proofRef} type="file" accept="image/jpeg,image/png,application/pdf" className="hidden" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} />
        <IdCard size={22} className="mx-auto text-gray-400 dark:text-white/40 mb-1" />
        <p className="text-sm text-gray-500 dark:text-white/55 font-dm">{proofFile ? proofFile.name : t.attach}</p>
      </div>

      {proofMsg && (
        <p className={`text-sm rounded-xl px-4 py-2.5 ${proofMsg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>{proofMsg.text}</p>
      )}

      {!proofMsg?.ok && (
        <button onClick={sendProof} disabled={proofBusy}
          className="w-full inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white py-3 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-60">
          {proofBusy ? <Loader2 size={17} className="animate-spin" /> : <UploadCloud size={17} />} {t.sendProof}
        </button>
      )}
    </div>
  );
}

/* ── Fiche programme (aperçu in-page, avec retour) ─────────────────────── */
const FICHE_T = {
  fr: { back: "← Retour", by: "Formatrice", chapters: "chapitres", lessons: "leçons", enroll: "Réserver ma place", program: "Programme", loading: "Chargement…", notfound: "Formation introuvable.",
    learn: "Ce que vous allez apprendre", included: "Cette formation inclut", reviews: "Avis des élèves", preview: "Aperçu", min: "min",
    lifetime: "Accès à vie", certificate: "Certificat de réussite", patterns: "Patrons PDF inclus", secure: "Paiement sécurisé", hd: "leçons vidéo HD",
    levels: { debutant: "Débutant", intermediaire: "Intermédiaire", avance: "Avancé" } as Record<string, string> },
  ar: { back: "→ رجوع", by: "المدرّبة", chapters: "محاور", lessons: "دروس", enroll: "احجزي مكانك", program: "البرنامج", loading: "جارٍ التحميل…", notfound: "التكوين غير موجود.",
    learn: "ماذا ستتعلّمين", included: "تشمل هذه الدورة", reviews: "آراء الطالبات", preview: "معاينة", min: "د",
    lifetime: "وصول مدى الحياة", certificate: "شهادة إتمام", patterns: "باترونات PDF مرفقة", secure: "دفع آمن", hd: "درس فيديو HD",
    levels: { debutant: "مبتدئ", intermediaire: "متوسط", avance: "متقدم" } as Record<string, string> },
  en: { back: "← Back", by: "Instructor", chapters: "chapters", lessons: "lessons", enroll: "Reserve my spot", program: "Program", loading: "Loading…", notfound: "Course not found.",
    learn: "What you'll learn", included: "This course includes", reviews: "Student reviews", preview: "Preview", min: "min",
    lifetime: "Lifetime access", certificate: "Certificate of completion", patterns: "PDF patterns included", secure: "Secure payment", hd: "HD video lessons",
    levels: { debutant: "Beginner", intermediaire: "Intermediate", avance: "Advanced" } as Record<string, string> },
} as const;

function CourseFicheModal({ courseId, lang, onClose, onEnroll, fmt }: {
  courseId: string | null; lang: Lang; onClose: () => void; onEnroll: (id: string) => void; fmt: (n: number) => string;
}) {
  const t = FICHE_T[lang];
  const rtl = lang === "ar";
  const [fiche, setFiche] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!courseId) { setFiche(null); return; }
    setLoading(true); setFiche(null);
    getCourseFiche(courseId).then((res) => { setLoading(false); setFiche(res.ok ? res.fiche : false); });
  }, [courseId]);

  if (!courseId) return null;

  const title = fiche && fiche !== false ? (lang === "ar" ? fiche.titre_ar || fiche.titre_fr : lang === "en" ? fiche.titre_en || fiche.titre_fr : fiche.titre_fr) : "";
  const desc = fiche && fiche !== false ? (lang === "ar" ? fiche.description_ar || fiche.description_fr : lang === "en" ? fiche.description_en || fiche.description_fr : fiche.description_fr) : "";

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4" dir={rtl ? "rtl" : "ltr"}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[92vh] overflow-y-auto bg-white dark:bg-[#15102b] rounded-t-3xl sm:rounded-3xl shadow-2xl">
        {/* Barre retour (sticky) */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-5 py-3 bg-white/95 dark:bg-[#15102b]/95 backdrop-blur border-b border-cream-200 dark:border-white/10">
          <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-white/80 hover:text-orange-600">
            {t.back}
          </button>
          <button onClick={onClose} aria-label="Fermer" className="w-8 h-8 grid place-items-center rounded-full hover:bg-cream-100 dark:hover:bg-white/10 text-gray-500"><X size={18} /></button>
        </div>

        {loading && <div className="p-10 text-center text-gray-500"><Loader2 size={22} className="animate-spin mx-auto" /><p className="mt-2 text-sm">{t.loading}</p></div>}
        {fiche === false && <div className="p-10 text-center text-gray-500 font-dm">{t.notfound}</div>}

        {fiche && fiche !== false && (
          <div>
            {fiche.thumbnail && <img src={fiche.thumbnail} alt={title} className="w-full h-44 object-cover" />}
            <div className="p-6">
              <h3 className="font-playfair text-2xl font-bold text-gray-900 dark:text-white">{title}</h3>

              {/* Formatrice */}
              {fiche.formateurNom && (
                <div className="flex flex-wrap items-center gap-3 mt-3">
                  <span className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-white/70">
                    <span className="w-8 h-8 rounded-full bg-orange-DEFAULT/15 text-orange-600 grid place-items-center overflow-hidden">
                      {fiche.formateurAvatar ? <img src={fiche.formateurAvatar} alt="" className="w-full h-full object-cover" /> : (fiche.formateurNom[0] ?? "?")}
                    </span>
                    {t.by} <strong className="text-gray-800 dark:text-white">{fiche.formateurNom}</strong>
                    {fiche.formateurVille && <span className="inline-flex items-center gap-0.5 text-gray-400"><MapPin size={12} /> {fiche.formateurVille}</span>}
                  </span>
                </div>
              )}

              {/* Méta : niveau, note, chapitres, leçons, durée, prix */}
              <div className="flex flex-wrap gap-2 mt-4">
                {fiche.niveau && <span className="inline-flex items-center gap-1 text-xs font-semibold bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 rounded-full px-3 py-1"><BarChart3 size={12} /> {t.levels[fiche.niveau] ?? fiche.niveau}</span>}
                {fiche.avgRating && <span className="inline-flex items-center gap-1 text-xs font-bold bg-orange-50 text-orange-600 rounded-full px-3 py-1"><Star size={12} className="fill-orange-400 text-orange-400" /> {fiche.avgRating.toFixed(1)} ({fiche.reviews.length})</span>}
                <span className="text-xs font-semibold bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 rounded-full px-3 py-1">{fiche.chaptersCount} {t.chapters}</span>
                <span className="text-xs font-semibold bg-violet-50 dark:bg-violet-500/10 text-violet-700 dark:text-violet-300 rounded-full px-3 py-1">{fiche.lessonsTotal} {t.lessons}</span>
                {fiche.duree && <span className="text-xs font-semibold bg-cream-100 dark:bg-white/10 text-gray-600 dark:text-white/70 rounded-full px-3 py-1">⏱ {fiche.duree}</span>}
                {fiche.prixDzd > 0 && <span className="text-xs font-bold bg-orange-50 text-orange-600 rounded-full px-3 py-1">{fmt(fiche.prixDzd)}</span>}
              </div>

              {desc && <p className="text-sm text-gray-600 dark:text-white/70 font-dm leading-relaxed mt-4 whitespace-pre-line">{desc}</p>}

              {/* Ce que vous allez apprendre */}
              {fiche.chapters.length > 0 && (
                <div className="mt-6">
                  <p className="font-semibold text-gray-800 dark:text-white mb-2.5">{t.learn}</p>
                  <div className="grid sm:grid-cols-2 gap-x-4 gap-y-2">
                    {fiche.chapters.map((ch: any, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Check size={16} className="text-orange-DEFAULT flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 dark:text-white/70">{ch.titre}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Programme détaillé (chapitres + leçons) */}
              {fiche.chapters.length > 0 && (
                <div className="mt-6">
                  <p className="font-semibold text-gray-800 dark:text-white mb-2.5">{t.program}</p>
                  <div className="space-y-2">
                    {fiche.chapters.map((ch: any, i: number) => (
                      <details key={i} className="group rounded-xl border border-cream-200 dark:border-white/10 overflow-hidden" open={i === 0}>
                        <summary className="flex items-center justify-between gap-3 cursor-pointer py-2.5 px-3.5 bg-cream-50 dark:bg-white/[0.04] list-none">
                          <span className="text-sm font-semibold text-gray-800 dark:text-white truncate"><span className="text-orange-600 me-1.5">{i + 1}.</span>{ch.titre}</span>
                          <span className="text-xs text-gray-400 shrink-0">{ch.lessons} {t.lessons}</span>
                        </summary>
                        {(ch.items?.length ?? 0) > 0 && (
                          <div className="divide-y divide-cream-100 dark:divide-white/5">
                            {ch.items.map((l: any, j: number) => (
                              <div key={j} className="flex items-center justify-between gap-3 py-2 px-3.5 ps-5 text-sm">
                                <span className="flex items-center gap-2 text-gray-600 dark:text-white/60 truncate">
                                  {l.preview ? <PlayCircle size={14} className="text-orange-DEFAULT flex-shrink-0" /> : <Lock size={12} className="text-gray-300 dark:text-white/30 flex-shrink-0" />}
                                  <span className="truncate">{l.titre}</span>
                                  {l.preview && <span className="text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-500/15 px-1.5 py-0.5 rounded shrink-0">{t.preview}</span>}
                                </span>
                                {l.duree && <span className="text-xs text-gray-400 shrink-0">{l.duree} {t.min}</span>}
                              </div>
                            ))}
                          </div>
                        )}
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {/* Cette formation inclut */}
              <div className="mt-6">
                <p className="font-semibold text-gray-800 dark:text-white mb-2.5">{t.included}</p>
                <ul className="grid sm:grid-cols-2 gap-2 text-sm">
                  {[
                    { Icon: InfinityIcon, label: t.lifetime },
                    { Icon: PlayCircle, label: `${fiche.lessonsTotal} ${t.hd}` },
                    { Icon: FileText, label: t.patterns },
                    { Icon: Award, label: t.certificate },
                    { Icon: ShieldCheck, label: t.secure },
                  ].map(({ Icon, label }) => (
                    <li key={label} className="flex items-start gap-2 text-gray-700 dark:text-white/70">
                      <Icon size={16} className="text-violet-DEFAULT dark:text-violet-300 flex-shrink-0 mt-0.5" /> {label}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Avis des élèves */}
              {fiche.reviews?.length > 0 && (
                <div className="mt-6">
                  <p className="font-semibold text-gray-800 dark:text-white mb-2.5 flex items-center gap-2">
                    {fiche.avgRating && <span className="inline-flex items-center gap-1 text-orange-DEFAULT"><Star size={16} className="fill-orange-400 text-orange-400" /> {fiche.avgRating.toFixed(1)}</span>}
                    {t.reviews}
                  </p>
                  <div className="space-y-2.5">
                    {fiche.reviews.slice(0, 4).map((r: any, i: number) => (
                      <div key={i} className="rounded-xl bg-cream-50/70 dark:bg-white/[0.03] border border-cream-200 dark:border-white/10 p-3">
                        <p className="text-orange-DEFAULT text-xs tracking-wide mb-1">{"★".repeat(r.note)}<span className="text-gray-300 dark:text-white/20">{"★".repeat(5 - r.note)}</span></p>
                        {r.commentaire && <p className="text-sm text-gray-700 dark:text-white/70 leading-relaxed">{r.commentaire}</p>}
                        <p className="text-xs font-semibold text-gray-500 dark:text-white/50 mt-1.5">{r.nom}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={() => { onClose(); onEnroll(courseId); }}
                className="w-full mt-6 inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white py-3.5 rounded-xl font-bold hover:bg-orange-600 transition-colors">
                <CheckCircle2 size={18} /> {t.enroll}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── CTA final ─────────────────────────────────────────────────────────── */
function FinalCta({ lang }: { lang: Lang }) {
  const t = OFFRE[lang].finalCta;
  return (
    <Section className="py-12 sm:py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-violet-900 via-violet-800 to-[#2a1245] px-7 sm:px-14 py-16 text-center shadow-2xl">
          <div className="absolute inset-3 rounded-[2rem] border border-dashed border-white/15 pointer-events-none" />
          <div className="absolute -top-16 end-10 w-56 h-56 rounded-full bg-orange-500/30 blur-3xl" />
          <div className="absolute -bottom-20 start-6 w-64 h-64 rounded-full bg-violet-500/30 blur-3xl" />
          <div className="relative">
            <Scissors className="mx-auto text-orange-300 mb-5" size={32} strokeWidth={1.5} />
            <AnimatedText
              as="h2"
              text={`${t.title} ${t.titleHi}`}
              textClassName="font-playfair text-3xl sm:text-5xl font-bold text-white leading-tight max-w-2xl mx-auto"
              underlineClassName="text-orange-400"
            >
              {t.title} <span className="italic text-orange-300">{t.titleHi}</span>
            </AnimatedText>
            <p className="text-violet-200 font-dm mt-4 max-w-lg mx-auto">{t.sub}</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mt-9">
              <a href="#inscription" className="inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-glow hover:bg-orange-500 hover:-translate-y-0.5 transition-all">
                {t.primary}
              </a>
              <Link href="/formations" className="inline-flex items-center justify-center gap-2 border-2 border-white/25 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/10 transition-colors">
                {t.secondary}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ── Méthodes de paiement (direct vs abonnement) ───────────────────────── */
const PAYMETHODS_T = {
  fr: {
    eyebrow: "Paiement", title: "Deux façons de t'inscrire", sub: "Choisis la formule qui te convient — l'accès est le même.",
    directTitle: "Paiement direct", directDesc: "Tu règles la formation en une fois et tu accèdes immédiatement à 100 % du contenu.",
    directPoints: ["Accès complet tout de suite", "1 mois offert sur certaines formations", "Simple et rapide"],
    subTitle: "Paiement par abonnement", subDesc: "Tu étales le coût sur plusieurs mois ; le contenu s'ouvre au fur et à mesure de tes paiements.",
    subPoints: ["Tu paies chaque mois", "Les chapitres s'ouvrent progressivement", "Rappel par email à chaque échéance"],
  },
  ar: {
    eyebrow: "الدفع", title: "طريقتان للتسجيل", sub: "اختاري الصيغة التي تناسبك — الوصول نفسه.",
    directTitle: "الدفع المباشر", directDesc: "تدفعين ثمن التكوين دفعة واحدة وتحصلين فوراً على 100% من المحتوى.",
    directPoints: ["وصول كامل فوراً", "شهر مجاني على بعض التكوينات", "بسيط وسريع"],
    subTitle: "الدفع بالتقسيط", subDesc: "توزّعين التكلفة على عدة أشهر ؛ يُفتح المحتوى تدريجياً مع دفعاتك.",
    subPoints: ["تدفعين كل شهر", "تُفتح الفصول تدريجياً", "تذكير بالبريد عند كل دفعة"],
  },
  en: {
    eyebrow: "Payment", title: "Two ways to enroll", sub: "Pick the plan that suits you — same access.",
    directTitle: "Direct payment", directDesc: "Pay the course in one go and unlock 100% of the content right away.",
    directPoints: ["Full access immediately", "1 month free on some courses", "Simple and fast"],
    subTitle: "Subscription payment", subDesc: "Spread the cost over several months; content unlocks as you pay.",
    subPoints: ["Pay every month", "Chapters open progressively", "Email reminder each due date"],
  },
} as const;

function PaymentMethodsSection({ lang }: { lang: Lang }) {
  const t = PAYMETHODS_T[lang];
  const cards = [
    { icon: CreditCard, title: t.directTitle, desc: t.directDesc, points: t.directPoints, accent: "text-orange-600" },
    { icon: CalendarClock, title: t.subTitle, desc: t.subDesc, points: t.subPoints, accent: "text-violet-600 dark:text-violet-300" },
  ];
  return (
    <Section className="py-16 sm:py-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="font-dm text-[11px] tracking-[0.25em] uppercase text-orange-600">{t.eyebrow}</p>
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold mt-1">{t.title}</h2>
          <p className="text-gray-500 dark:text-white/50 font-dm mt-2">{t.sub}</p>
        </div>
        <div className="grid md:grid-cols-2 gap-5">
          {cards.map((c) => (
            <div key={c.title} className="rounded-2xl bg-white dark:bg-white/[0.04] border border-cream-200 dark:border-white/10 p-6 shadow-soft">
              <c.icon size={28} className={c.accent} />
              <h3 className="font-playfair text-xl font-bold mt-3">{c.title}</h3>
              <p className="text-sm text-gray-500 dark:text-white/55 font-dm mt-1.5">{c.desc}</p>
              <ul className="mt-4 space-y-2">
                {c.points.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-sm text-gray-700 dark:text-white/75 font-dm">
                    <CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ── Diplôme de fin de formation ───────────────────────────────────────── */
const DIPLOMA_T = {
  fr: {
    eyebrow: "Reconnaissance", title: "Ton diplôme à la fin de la formation", sub: "Termine tes travaux pratiques et reçois un diplôme officiel Arazzo — livré chez toi.",
    points: ["Diplôme nominatif signé", "Basé sur tes travaux pratiques validés", "Version PDF + exemplaire physique livré"],
    badge: "Diplôme de couture", holder: "Décerné à",
  },
  ar: {
    eyebrow: "اعتراف", title: "شهادتك في نهاية التكوين", sub: "أكملي أعمالك التطبيقية واحصلي على شهادة أرازو رسمية — تُسلَّم إلى منزلك.",
    points: ["شهادة باسمك وموقّعة", "مبنية على أعمالك التطبيقية المعتمدة", "نسخة PDF + نسخة ورقية تُسلَّم"],
    badge: "شهادة في الخياطة", holder: "تُمنح إلى",
  },
  en: {
    eyebrow: "Recognition", title: "Your diploma at the end of the course", sub: "Complete your practical work and receive an official Arazzo diploma — delivered to your home.",
    points: ["Named, signed diploma", "Based on your approved practical work", "PDF version + physical copy delivered"],
    badge: "Sewing diploma", holder: "Awarded to",
  },
} as const;

function DiplomaSection({ lang }: { lang: Lang }) {
  const t = DIPLOMA_T[lang];
  return (
    <Section className="py-16 sm:py-20 bg-gradient-to-b from-transparent to-cream-100/50 dark:to-white/[0.02]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <p className="font-dm text-[11px] tracking-[0.25em] uppercase text-orange-600">{t.eyebrow}</p>
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold mt-1">{t.title}</h2>
          <p className="text-gray-500 dark:text-white/55 font-dm mt-3">{t.sub}</p>
          <ul className="mt-5 space-y-2.5">
            {t.points.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm text-gray-700 dark:text-white/75 font-dm">
                <BadgeCheck size={18} className="text-violet-600 dark:text-violet-300 shrink-0 mt-0.5" /> {p}
              </li>
            ))}
          </ul>
        </div>
        {/* Maquette de diplôme */}
        <div className="relative">
          <div className="rounded-2xl border-4 border-double border-orange-300/70 bg-white dark:bg-[#1b1430] p-8 text-center shadow-glow">
            <Award size={40} className="mx-auto text-orange-500" />
            <p className="font-dm text-[10px] tracking-[0.3em] uppercase text-gray-400 mt-3">{t.badge}</p>
            <p className="font-playfair text-2xl font-bold mt-1 text-violet-950 dark:text-white">Arazzo Formation</p>
            <div className="my-4 h-px bg-gradient-to-r from-transparent via-orange-300 to-transparent" />
            <p className="font-dm text-xs text-gray-400">{t.holder}</p>
            <p className="font-playfair text-lg italic text-gray-700 dark:text-white/80">— ton nom —</p>
            <div className="mt-4 flex items-center justify-center gap-2 text-violet-600 dark:text-violet-300">
              <GraduationCap size={18} /> <Scissors size={16} />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
