"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe";
import {
  Video, BookOpen, Home, Scissors, Users, HeartHandshake,
  Sparkles, ArrowLeft, Star, Quote, Upload, CheckCircle2, FileCheck2,
  ChevronLeft, ChevronRight, Loader2, UploadCloud, Trophy, Wallet, IdCard,
  Instagram, BadgeCheck, type LucideIcon,
} from "lucide-react";
import { LangSwitcherPublic } from "@/components/layout/lang-switcher-public";
import { AnimatedText } from "@/components/ui/animated-text";
import { OFFRE, type Lang } from "./offre-i18n";
import { createClient } from "@/lib/supabase/client";
import { submitLead, createLeadProofUploadUrl, recordLeadProof } from "@/app/actions/rejoindre";

/* ── Types partagés ────────────────────────────────────────────────────── */
export type Level = "debutant" | "intermediaire" | "avance";
export interface CourseOption { id: string; titre: string; niveau: string; prixDzd: number; thumbnail: string | null; slug: string; }
export interface PayInfo { account_number?: string; account_key?: string; beneficiary_name?: string; rip?: string; }

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
const PATH_IMG = ["/images/hero-modelisme-1.jpg", "/images/cours-modelisme-feminin.jpg", "/images/hero-modelisme-3.png"];
const PATH_LESSONS = [12, 18, 20];

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

export function SalesPage({ lang = "fr", courses = [], pay = null }: { lang?: Lang; courses?: CourseOption[]; pay?: PayInfo | null }) {
  const t = OFFRE[lang];

  // État partagé Quiz → Parcours → Inscription
  const [recommended, setRecommended] = useState<Level>("debutant");
  const [hasReco, setHasReco] = useState(false);
  const [courseId, setCourseId] = useState("");
  const [phase, setPhase] = useState<"form" | "done">("form");

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

  return (
    <div className="bg-cream-DEFAULT dark:bg-[#0b0818] text-gray-900 dark:text-white overflow-x-hidden">
      <Header lang={lang} />
      <Hero lang={lang} />
      <Why lang={lang} />
      <Paths lang={lang} courses={courses} onEnroll={(cid) => enroll(null, cid)} />
      <TestBand lang={lang} />
      <Testimonials lang={lang} />
      <Gallery lang={lang} />
      <Quiz lang={lang} courses={courses} onEnroll={(lvl) => enroll(lvl)} />
      {courses.length > 0 && (
        <Inscription
          lang={lang} courses={courses} pay={pay}
          recommended={recommended} hasReco={hasReco}
          courseId={courseId} setCourseId={setCourseId}
          phase={phase} setPhase={setPhase}
        />
      )}
      <FinalCta lang={lang} />

      <footer className="border-t border-cream-200 dark:border-white/10 py-8 text-center text-sm text-gray-400 dark:text-white/40 font-dm">
        © {new Date().getFullYear()} Arazzo Formation — {t.hero.eyebrow}
      </footer>
    </div>
  );
}

/* ── En-tête ───────────────────────────────────────────────────────────── */
function Header({ lang }: { lang: Lang }) {
  const t = OFFRE[lang].nav;
  return (
    <header className="sticky top-0 z-50 bg-cream-DEFAULT/85 dark:bg-[#0b0818]/85 backdrop-blur-md border-b border-cream-200 dark:border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="font-playfair text-xl font-bold">
          <span className="text-violet-DEFAULT dark:text-violet-300">Arazzo</span>
          <span className="text-orange-DEFAULT"> Formation</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/commandes" className="hidden md:inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-white/70 hover:text-orange-600 px-2">
            <Upload size={15} /> {t.uploadProof}
          </Link>
          <Link href="/dashboard/commandes" className="hidden lg:inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 dark:text-white/70 hover:text-orange-600 px-2">
            <FileCheck2 size={15} /> {t.confirmReg}
          </Link>
          <Link href="/formations" className="hidden sm:inline text-sm font-medium text-gray-600 dark:text-white/70 hover:text-orange-600 px-2">{t.courses}</Link>
          <LangSwitcherPublic current={lang} scrolled />
          <a href="#quiz" className="inline-flex items-center gap-1.5 bg-orange-DEFAULT text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-orange-600 transition-colors">
            <Sparkles size={15} /> {t.testLevel}
          </a>
        </div>
      </div>
    </header>
  );
}

/* ── Héro ──────────────────────────────────────────────────────────────── */
function Hero({ lang }: { lang: Lang }) {
  const t = OFFRE[lang].hero;
  const reduce = useReducedMotionSafe();
  const chipDots = ["bg-green-500", "bg-orange-500", "bg-violet-500"];
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
            <img src="/images/mannequin-couture.jpg" alt={t.instructorName} className="w-full h-full object-cover" />
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
            <a href="#inscription" className="group inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white px-7 py-3.5 rounded-2xl font-bold text-lg shadow-glow hover:bg-orange-600 hover:-translate-y-0.5 transition-all font-dm">
              {t.ctaPrimary}
              <ArrowLeft size={20} className="rtl:rotate-0 ltr:rotate-180 group-hover:-translate-x-1 transition-transform" />
            </a>
            <Link href="/formations" className="inline-flex items-center justify-center gap-2 border-2 border-violet-DEFAULT text-violet-700 dark:text-violet-300 dark:border-violet-400 px-7 py-3.5 rounded-2xl font-semibold text-lg hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors font-dm">
              {t.ctaSecondary}
            </Link>
          </div>

          <div className="flex flex-wrap gap-2.5 mt-7 justify-center lg:justify-start">
            {t.chips.map((c, i) => (
              <span key={c} className="inline-flex items-center gap-2 bg-white dark:bg-white/5 border border-cream-200 dark:border-white/10 rounded-full px-3.5 py-1.5 text-sm font-dm text-gray-700 dark:text-white/70 shadow-soft">
                <span className={`w-2 h-2 rounded-full ${chipDots[i % chipDots.length]}`} /> {c}
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {t.cards.map((c, i) => {
            const Icon = WHY_ICONS[i];
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

/* ── Parcours / formations ─────────────────────────────────────────────── */
function Paths({ lang, courses, onEnroll }: { lang: Lang; courses: CourseOption[]; onEnroll: (courseId: string) => void }) {
  const t = OFFRE[lang].paths;
  const ins = OFFRE[lang].inscription;
  const fmt = (n: number) => `${Number(n).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-DZ")} ${ins.currency}`;

  // Cartes réelles si des formations existent, sinon repli sur le contenu statique.
  // On met en avant 3 formations (une par niveau) pour rester sur « trois parcours clairs » ;
  // toutes les autres restent accessibles via « Voir toutes les formations » et le menu déroulant d'inscription.
  const useReal = courses.length > 0;
  const featured = (() => {
    const perLevel = LEVELS.map((lv) => courses.find((c) => c.niveau === lv)).filter(Boolean) as CourseOption[];
    const base = perLevel.length > 0 ? perLevel : courses.slice(0, 3);
    const extra = courses.filter((c) => !base.includes(c));
    return [...base, ...extra].slice(0, 3);
  })();
  const items = useReal ? featured : t.cards.map((c, i) => ({ id: String(i), titre: c.name, sub: c.sub, niveau: LEVELS[c.level], prixDzd: 0, thumbnail: null as string | null, slug: "" }));

  return (
    <Section className="py-20 sm:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="inline-flex items-center gap-2 text-violet-700 dark:text-violet-300 font-dm text-xs font-bold uppercase tracking-[0.2em]">
            <Sparkles size={14} /> {t.eyebrow}
          </span>
          <h2 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold mt-3">{t.title}</h2>
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
                    <span className="absolute top-3 end-3 text-[11px] font-extrabold px-2.5 py-1 rounded-full bg-orange-DEFAULT text-white shadow">★ {t.popular}</span>
                  )}
                  <span className="absolute bottom-3 end-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-white/90 text-gray-800">
                    {useReal && c.prixDzd > 0 ? fmt(c.prixDzd) : t.lessons(PATH_LESSONS[i % PATH_LESSONS.length])}
                  </span>
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <h3 className="font-playfair text-xl font-bold">{c.titre}</h3>
                  <p className="text-sm text-gray-500 dark:text-white/50 font-dm mt-1">{sub}</p>
                  <div className="flex gap-2 mt-auto pt-5">
                    {useReal && c.slug ? (
                      <Link href={`/formations/${c.slug}`} className="flex-1 text-center border border-violet-DEFAULT text-violet-700 dark:text-violet-300 py-2.5 rounded-xl font-semibold text-sm hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors">
                        {t.moreInfo}
                      </Link>
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
          <span className="text-violet-700 dark:text-violet-300 font-dm text-xs font-bold uppercase tracking-[0.2em]">{t.eyebrow}</span>
          <h2 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold mt-3">{t.title}</h2>
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

/* ── Inscription (formulaire → paiement → preuve) ──────────────────────── */
function Inscription({
  lang, courses, pay, recommended, hasReco, courseId, setCourseId, phase, setPhase,
}: {
  lang: Lang; courses: CourseOption[]; pay: PayInfo | null;
  recommended: Level; hasReco: boolean;
  courseId: string; setCourseId: (v: string) => void;
  phase: "form" | "done"; setPhase: (p: "form" | "done") => void;
}) {
  const t = OFFRE[lang].inscription;
  const fmt = (n: number) => `${Number(n).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-DZ")} ${t.currency}`;
  const levelLabel = (n: string) => t.levelLabels[(n as Level)] ?? n;

  const [form, setForm] = useState({ full_name: "", email: "", phone: "", wilaya: WILAYAS[0] });
  const [submitting, startSubmit] = useTransition();
  const [formErr, setFormErr] = useState("");

  // Preuve de paiement
  const [proofEmail, setProofEmail] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const proofRef = useRef<HTMLInputElement>(null);
  const [proofBusy, setProofBusy] = useState(false);
  const [proofMsg, setProofMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const total = courses.find((c) => c.id === courseId)?.prixDzd ?? 0;
  const field = "w-full rounded-xl border border-cream-200 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-sm text-violet-950 dark:text-white placeholder:text-violet-950/35 dark:placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-500";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormErr("");
    startSubmit(async () => {
      const res = await submitLead({ ...form, courseId, level: recommended });
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
          <span className="inline-flex items-center gap-2 text-violet-700 dark:text-violet-300 font-dm text-xs font-bold uppercase tracking-[0.2em]">
            <Sparkles size={14} /> {t.eyebrow}
          </span>
          <h2 className="font-playfair text-3xl sm:text-4xl font-bold mt-3">{t.title}</h2>
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
              <div className="text-5xl mb-2">🎉</div>
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
        ) : (
          <form onSubmit={submit} className="bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-white/70 mb-1.5">{t.chooseCourse} *</label>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)} required className={field}>
                <option value="">{t.coursePlaceholder}</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.titre} · {levelLabel(c.niveau)} · {fmt(c.prixDzd)}</option>
                ))}
              </select>
            </div>
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
            {formErr && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-2.5">{formErr}</p>}
            <button type="submit" disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-orange-DEFAULT to-orange-500 text-white py-3.5 rounded-xl font-bold shadow-glow disabled:opacity-60">
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle2 size={18} />} {t.submit}
            </button>
            <p className="text-xs text-gray-400 dark:text-white/40 text-center">{t.noCommitment}</p>
          </form>
        )}

        {/* Déjà inscrite ? (dépôt de preuve) */}
        {phase !== "done" && (
          <div className="mt-8">
            <details className="bg-white dark:bg-white/[0.04] rounded-2xl border border-cream-200 dark:border-white/10 p-5">
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
  return (
    <div className="space-y-4">
      <ol className="text-sm text-gray-600 dark:text-white/70 font-dm space-y-1.5 list-decimal ps-5">
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>

      {pay && (
        <div className="rounded-xl bg-cream-50 dark:bg-white/5 border border-cream-200 dark:border-white/10 p-4 text-sm font-dm">
          <p className="font-semibold flex items-center gap-1.5 mb-1"><Wallet size={15} className="text-violet-600 dark:text-violet-300" /> {t.payTitle}</p>
          {pay.beneficiary_name && <p className="text-gray-600 dark:text-white/70">{t.beneficiary} : <strong>{pay.beneficiary_name}</strong></p>}
          {pay.account_number && <p className="text-gray-600 dark:text-white/70">{t.account} : <strong>{pay.account_number}</strong></p>}
          {pay.account_key && <p className="text-gray-600 dark:text-white/70">{t.key} : <strong>{pay.account_key}</strong></p>}
          {pay.rip && <p className="text-gray-600 dark:text-white/70">{t.rip} : <strong>{pay.rip}</strong></p>}
        </div>
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
