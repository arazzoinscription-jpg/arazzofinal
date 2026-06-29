"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView, type Variants } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe";
import {
  ArrowUpRight, ArrowRight, FolderOpen, BookOpen, Scissors,
  PencilRuler, Palette, Hand, Crown, ShoppingBag, Factory, Shirt, Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { CatItem } from "./category-grid";
import type { Lang } from "@/lib/store-i18n";

/**
 * Index éditorial des univers de formation — refonte complète de l'affichage
 * « catégories » de la racine (remplace l'ancien mélange showcase-vidéo + grille).
 *
 * Principe : UN sommaire cohérent, façon « planche de patron ».
 *  - Univers vedette (N° 01) en grand format asymétrique : photo encadrée + fiche.
 *  - Le reste en grille organisée de pochettes (description courte + comptage).
 * Aucune rangée « 3 cartes égales » ; numérotation mono, repères de coupe, couture
 * en pointillés ; entrées en cascade respectant prefers-reduced-motion.
 */

const UI = {
  fr: { eyebrow: "Le sommaire", title: "Choisissez votre", titleHi: "univers", sub: "Trois métiers, un seul fil conducteur : du croquis à la pièce finie. Choisissez par où commencer.", featured: "Univers vedette", explore: "Explorer cet univers", open: "Ouvrir" },
  ar: { eyebrow: "الفهرس", title: "اختاري", titleHi: "مجالك", sub: "ثلاث حرف وخيط واحد يجمعها: من الرسم إلى القطعة المكتملة. اختاري من أين تبدئين.", featured: "المجال المميّز", explore: "استكشفي هذا المجال", open: "افتح" },
  en: { eyebrow: "The index", title: "Choose your", titleHi: "discipline", sub: "Three crafts, one common thread: from sketch to finished piece. Pick where to begin.", featured: "Featured discipline", explore: "Explore this discipline", open: "Open" },
} as const;

/** Fiche éditoriale par univers connu (description + icône + photo locale de secours). */
const UNIVERS: Record<string, { Icon: LucideIcon; img?: string; desc: Record<Lang, string> }> = {
  modelisme: {
    Icon: PencilRuler, img: "/images/cat-modelisme.jpg",
    desc: { fr: "Le cœur du métier : patronage, gradation et transformation des modèles, du tracé à la pièce.", ar: "قلب الحرفة: الباترون، التدريج وتحويل الموديلات، من الرسم إلى القطعة.", en: "The heart of the craft: patternmaking, grading and transforming models, from line to piece." },
  },
  stylisme: {
    Icon: Palette, img: "/images/cat-stylisme.jpg",
    desc: { fr: "L'art de concevoir : dessin de mode, choix des matières et collections qui ont une vraie signature.", ar: "فنّ التصميم: رسم الموضة، اختيار الأقمشة ومجموعات بتوقيع خاص.", en: "The art of conceiving: fashion drawing, fabric choices and collections with real signature." },
  },
  artisanat: {
    Icon: Hand, img: "/images/cat-artisanat.jpg",
    desc: { fr: "Broderie, perlage et finitions à la main : le savoir-faire qui rend chaque pièce unique.", ar: "التطريز، التخريز واللمسات اليدوية: المهارة التي تجعل كل قطعة فريدة.", en: "Embroidery, beading and hand finishing: the know-how that makes every piece unique." },
  },
  couture: {
    Icon: Scissors, img: "/images/cat-couture.jpg",
    desc: { fr: "L'assemblage : montage, coutures, ourlets et finitions propres, du premier point au repassage.", ar: "التجميع: التركيب، الخياطة، الحواشي واللمسات النظيفة من أول غرزة.", en: "Assembly: construction, seams, hems and clean finishing, from first stitch to press." },
  },
  traditionnel: {
    Icon: Crown, img: "/images/cat-traditionnel.jpg",
    desc: { fr: "Caftan, karakou, djellaba : le patrimoine vestimentaire maghrébin, sa coupe et ses ornements.", ar: "القفطان، القاراكو، الجلابة: التراث المغاربي، قصّته وزخارفه.", en: "Caftan, karakou, djellaba: Maghrebi heritage dress, its cut and ornaments." },
  },
  accessoire: {
    Icon: ShoppingBag, img: "/images/cat-accessoire.jpg",
    desc: { fr: "Sacs, ceintures, chapeaux et maroquinerie : les pièces qui complètent et signent une tenue.", ar: "الحقائب، الأحزمة، القبعات والجلديات: القطع التي تُكمّل الإطلالة وتُميّزها.", en: "Bags, belts, hats and leather goods: the pieces that complete and sign an outfit." },
  },
  "modelisme-industriel": {
    Icon: Factory, img: "/images/cat-modelisme-industriel.jpg",
    desc: { fr: "Le patronage pour la production : standards de tailles, gradation industrielle et dossiers techniques.", ar: "الباترون للإنتاج: معايير المقاسات، التدريج الصناعي والملفات التقنية.", en: "Patternmaking for production: size standards, industrial grading and tech packs." },
  },
  "pret-a-porter": {
    Icon: Shirt, img: "/images/cat-pret-a-porter.jpg",
    desc: { fr: "Concevoir et produire des collections prêtes à porter : du modèle à la série, pensées pour la fabrication.", ar: "تصميم وإنتاج مجموعات جاهزة للارتداء: من الموديل إلى السلسلة، مصمّمة للتصنيع.", en: "Designing and producing ready-to-wear collections: from model to series, built for manufacturing." },
  },
  "haute-couture": {
    Icon: Sparkles, img: "/images/cat-haute-couture.jpg",
    desc: { fr: "L'excellence du sur-mesure : pièces d'exception, volumes travaillés et finitions main de très haut niveau.", ar: "تميّز الخياطة الراقية: قطع استثنائية، أحجام مدروسة ولمسات يدوية رفيعة المستوى.", en: "The pinnacle of made-to-measure: exceptional pieces, sculpted volumes and the finest hand finishing." },
  },
};

function univers(slug: string) {
  return UNIVERS[slug] ?? null;
}

export function CategoryIndex({ items, lang }: { items: CatItem[]; lang: Lang }) {
  const reduce = useReducedMotionSafe();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const t = UI[lang];
  if (!items.length) return null;

  const [hero, ...rest] = items;
  const heroU = univers(hero.slug);
  const heroImg = hero.image || heroU?.img || null;
  const HeroIcon = heroU?.Icon ?? FolderOpen;

  const container: Variants = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.08, delayChildren: 0.04 } } };
  const item: Variants = { hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 26 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };

  return (
    <section ref={ref} className="relative">
      {/* ── En-tête de sommaire ── */}
      <div className="mb-9 sm:mb-12">
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-orange-600 dark:text-orange-400 tnum">N° 00</span>
          <span className="h-px w-10 bg-violet-950/25 dark:bg-white/25" />
          <span className="text-[11px] sm:text-xs font-dm font-semibold uppercase tracking-[0.25em] text-violet-950/60 dark:text-white/55">{t.eyebrow}</span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 className="font-playfair text-3xl sm:text-4xl lg:text-[3.1rem] font-bold text-violet-950 dark:text-white leading-[1.05] tracking-tight">
            {t.title}{" "}
            <span className="relative inline-block italic text-orange-DEFAULT">
              {t.titleHi}
              <svg aria-hidden viewBox="0 0 200 14" preserveAspectRatio="none" className="absolute -bottom-1.5 start-0 w-full h-2.5 text-orange-DEFAULT">
                <path d="M2 9 C 50 2, 150 2, 198 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </span>
          </h2>
          <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-violet-950/45 dark:text-white/40 tnum pb-1">
            {String(items.length).padStart(2, "0")} {lang === "ar" ? "مجالات" : lang === "en" ? "disciplines" : "univers"}
          </span>
        </div>
        <p className="mt-4 max-w-xl text-violet-950/65 dark:text-white/60 font-dm leading-relaxed">{t.sub}</p>
        <span aria-hidden className="mt-6 block border-t border-dashed border-violet-950/15 dark:border-white/15" />
      </div>

      <motion.div variants={container} initial="hidden" animate={inView ? "show" : "hidden"} className="space-y-7 sm:space-y-9">
        {/* ── Univers vedette (N° 01) — planche asymétrique ── */}
        <motion.div variants={item}>
          <Link
            href={hero.href}
            className="group relative grid lg:grid-cols-2 gap-0 rounded-[1.6rem] overflow-hidden bg-cream-50 dark:bg-white/[0.04] ring-1 ring-violet-950/10 dark:ring-white/10 shadow-soft transition-all duration-300 hover:shadow-glow hover:ring-orange-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
          >
            {/* Photo */}
            <div className="relative h-64 lg:h-auto lg:min-h-[22rem] overflow-hidden">
              {heroImg ? (
                <img src={heroImg} alt="" loading="eager" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]" />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${hero.gradient}`} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-black/60 via-black/10 to-transparent" />
              <span className="absolute top-4 start-4 inline-flex items-center font-mono text-[10px] tracking-[0.25em] uppercase bg-orange-DEFAULT text-white px-2.5 py-1 rounded-md shadow-md tnum">N° 01</span>
              <span className="absolute top-4 end-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20">
                <span className="font-dm uppercase tracking-[0.18em] text-[10px]">{t.featured}</span>
              </span>
            </div>

            {/* Fiche */}
            <div className="relative p-6 sm:p-8 lg:p-10 flex flex-col justify-center">
              <span aria-hidden className="absolute top-5 start-5 w-3.5 h-3.5 border-t-2 border-s-2 border-violet-950/20 dark:border-white/20 hidden lg:block" />
              <span className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-300 font-dm text-xs font-bold uppercase tracking-[0.2em] mb-3">
                <HeroIcon size={15} /> {hero.metaLabel}
              </span>
              <h3 className="font-playfair text-3xl sm:text-4xl font-bold text-violet-950 dark:text-white leading-tight">{hero.name}</h3>
              {heroU && <p className="mt-3 text-violet-950/65 dark:text-white/60 font-dm leading-relaxed max-w-md">{heroU.desc[lang]}</p>}
              <span className="mt-7 inline-flex items-center gap-2 self-start bg-violet-DEFAULT text-white px-6 py-3 rounded-xl font-bold font-dm shadow-glow transition-transform duration-200 group-hover:-translate-y-0.5">
                {t.explore}
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1 rtl:rotate-180" />
              </span>
              <span aria-hidden className="mt-6 block h-0.5 w-12 rounded-full bg-orange-DEFAULT transition-all duration-300 group-hover:w-28" />
            </div>
          </Link>
        </motion.div>

        {/* ── Le reste des univers — grille organisée de pochettes ── */}
        {rest.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-7">
            {rest.map((c, i) => {
              const u = univers(c.slug);
              const img = c.image || u?.img || null;
              const Meta = c.isSub ? FolderOpen : BookOpen;
              const Icon = u?.Icon ?? Meta;
              const num = String(i + 2).padStart(2, "0");
              return (
                <motion.div key={c.id} variants={item}>
                  <Link
                    href={c.href}
                    className="group relative flex flex-col h-full rounded-[1.4rem] bg-cream-50 dark:bg-white/[0.04] p-3 ring-1 ring-violet-950/10 dark:ring-white/10 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-glow hover:ring-orange-300/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-DEFAULT dark:focus-visible:ring-offset-[#0d0a1c]"
                  >
                    <span aria-hidden className="absolute top-1.5 start-1.5 w-3 h-3 border-t-2 border-s-2 border-violet-950/20 dark:border-white/20 rounded-tl" />
                    <span aria-hidden className="absolute bottom-1.5 end-1.5 w-3 h-3 border-b-2 border-e-2 border-violet-950/20 dark:border-white/20 rounded-br" />

                    {/* Fenêtre-échantillon */}
                    <div className="relative h-44 sm:h-48 rounded-2xl overflow-hidden">
                      {img ? (
                        <img src={img} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.08]" />
                      ) : (
                        <div className={`absolute inset-0 bg-gradient-to-br ${c.gradient}`} />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" />
                      <span className="absolute top-3 start-3 inline-flex items-center font-mono text-[10px] tracking-[0.25em] uppercase bg-orange-DEFAULT text-white px-2.5 py-1 rounded-md shadow-md tnum">N° {num}</span>
                      <span className="absolute top-3 end-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur-md px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/20 tnum">
                        <Meta size={13} className="opacity-90" /> {c.count}
                      </span>
                      <div aria-hidden className="absolute bottom-0 inset-x-0 h-4 flex items-end justify-between px-2 pb-1 opacity-70">
                        {Array.from({ length: 18 }).map((_, k) => (
                          <span key={k} className={`block w-px bg-white/60 ${k % 3 === 0 ? "h-2.5" : "h-1.5"}`} />
                        ))}
                      </div>
                    </div>

                    {/* Rabat */}
                    <div className="relative mt-3 px-1.5 pb-1 flex-1 flex flex-col">
                      <span aria-hidden className="absolute -top-1.5 inset-x-1 border-t border-dashed border-violet-950/25 dark:border-white/20" />
                      <div className="flex items-start justify-between gap-3 pt-1.5">
                        <div className="min-w-0">
                          <h3 className="font-playfair text-xl font-bold leading-tight text-violet-950 dark:text-white truncate">{c.name}</h3>
                          <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-violet-950/55 dark:text-white/50">
                            <Icon size={12} /> {c.metaLabel}
                          </p>
                        </div>
                        <span className="shrink-0 w-9 h-9 rounded-full bg-violet-950 dark:bg-orange-DEFAULT text-white flex items-center justify-center shadow-md transition-transform duration-300 group-hover:rotate-45">
                          <ArrowUpRight size={17} className="rtl:-scale-x-100" />
                        </span>
                      </div>
                      {u && <p className="mt-2.5 text-sm text-violet-950/60 dark:text-white/55 font-dm leading-relaxed line-clamp-2">{u.desc[lang]}</p>}
                      <span aria-hidden className="mt-3 block h-0.5 w-10 rounded-full bg-orange-DEFAULT transition-all duration-300 group-hover:w-full" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </section>
  );
}
