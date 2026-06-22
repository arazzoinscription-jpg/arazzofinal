"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe";
import { ArrowRight, PencilRuler, Palette, Hand, Sparkles, Scissors, type LucideIcon } from "lucide-react";
import { AnimatedText } from "@/components/ui/animated-text";

interface Showcase {
  key: string;
  title: string;
  titleAr?: string;
  eyebrow: string;
  desc: string;
  href: string;
  cta: string;
  video: string;
  Icon: LucideIcon;
}

const SECTIONS: Showcase[] = [
  {
    key: "modelisme",
    title: "Modélisme",
    eyebrow: "La catégorie",
    desc: "Le cœur du métier : patronage, gradation et transformation des modèles. Apprenez à construire et adapter vos patrons, du croquis à la pièce finie.",
    href: "/formations?cat=modelisme",
    cta: "Découvrir le modélisme",
    video: "/videos/cat-modelisme.mp4",
    Icon: PencilRuler,
  },
  {
    key: "stylisme",
    title: "Stylisme",
    eyebrow: "La catégorie",
    desc: "L'art de concevoir : dessin de mode, choix des matières et création de collections qui ont du caractère et une vraie signature.",
    href: "/formations?cat=stylisme",
    cta: "Explorer le stylisme",
    video: "/videos/cat-stylisme.mp4",
    Icon: Palette,
  },
  {
    key: "artisanat",
    title: "Artisanat",
    titleAr: "الحرف اليدوية",
    eyebrow: "La catégorie",
    desc: "Broderie, perlage et finitions à la main : le savoir-faire artisanal qui sublime chaque création et rend vos pièces uniques.",
    href: "/formations?cat=artisanat",
    cta: "Voir l'artisanat",
    video: "/videos/cat-artisanat.mp4",
    Icon: Hand,
  },
];

/** Demi-section vidéo : la vidéo locale remplit ce côté comme un fond (aucun habillage). */
function VideoHalf({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "300px 0px" });
  return (
    <div ref={ref} className="relative h-64 lg:h-full min-h-[18rem] overflow-hidden bg-violet-950">
      {seen && (
        <video
          src={src}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      )}
    </div>
  );
}

function Row({ s, index }: { s: Showcase; index: number }) {
  const reduce = useReducedMotionSafe();
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const videoRight = index % 2 === 1; // modélisme : vidéo à gauche ; alternance ensuite

  const text = (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className="flex items-center"
    >
      <div className="px-6 sm:px-10 lg:px-14 py-12 lg:py-0 max-w-xl mx-auto">
        <span className="inline-flex items-center gap-2 text-orange-600 dark:text-orange-300 font-dm text-xs font-bold uppercase tracking-[0.2em] mb-3">
          <Sparkles size={14} /> {s.eyebrow}
        </span>
        <h2 className="font-playfair text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
          {s.title}
          {s.titleAr && <span className="block text-2xl sm:text-3xl text-violet-700 dark:text-violet-300 mt-1" dir="rtl">{s.titleAr}</span>}
        </h2>
        <p className="text-gray-600 dark:text-white/60 font-dm text-lg leading-relaxed mt-5">{s.desc}</p>
        <Link href={s.href}
          className="group inline-flex items-center gap-2 mt-7 bg-violet-DEFAULT text-white px-7 py-3.5 rounded-2xl font-bold shadow-glow hover:bg-violet-700 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-200 font-dm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-DEFAULT dark:focus-visible:ring-offset-[#0d0a1c]">
          <s.Icon size={18} /> {s.cta}
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform rtl:rotate-180" />
        </Link>
      </div>
    </motion.div>
  );

  return (
    <div ref={ref} className="grid lg:grid-cols-2 min-h-[70vh] bg-cream-DEFAULT dark:bg-[#0d0a1c]">
      {videoRight ? (
        <>
          <div className="order-2 lg:order-1">{text}</div>
          <div className="order-1 lg:order-2"><VideoHalf src={s.video} /></div>
        </>
      ) : (
        <>
          <VideoHalf src={s.video} />
          {text}
        </>
      )}
    </div>
  );
}

export function CategoryShowcase() {
  return (
    <div className="relative">
      {SECTIONS.map((s, i) => <Row key={s.key} s={s} index={i} />)}

      {/* CTA final */}
      <section className="relative bg-cream-DEFAULT dark:bg-[#0d0a1c] py-16 sm:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-violet-900 via-violet-800 to-[#2a1245] px-7 sm:px-14 py-14 text-center shadow-2xl">
            <div className="absolute inset-3 rounded-[2rem] border border-dashed border-white/15 pointer-events-none" />
            <div className="absolute -top-16 end-10 w-56 h-56 rounded-full bg-orange-500/30 blur-3xl" />
            <div className="relative">
              <Scissors className="mx-auto text-orange-300 mb-5" size={32} strokeWidth={1.5} />
              <AnimatedText
                as="h2"
                text="Trouvez la catégorie faite pour vous"
                textClassName="font-playfair text-3xl sm:text-4xl font-bold text-white leading-tight max-w-2xl mx-auto"
                underlineClassName="text-orange-400"
              >
                Trouvez la catégorie faite pour <span className="italic text-orange-300">vous</span>
              </AnimatedText>
              <p className="text-violet-200 font-dm mt-4 max-w-lg mx-auto">
                Modélisme, stylisme, artisanat… chaque parcours vous mène, point après point, du débutant au métier.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
                <Link href="/register" className="shiny-cta inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-orange-500 transition-colors">
                  Commencer maintenant
                </Link>
                <Link href="/boutique" className="inline-flex items-center justify-center gap-2 border-2 border-white/25 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:bg-white/10 transition-colors">
                  Voir la boutique
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
