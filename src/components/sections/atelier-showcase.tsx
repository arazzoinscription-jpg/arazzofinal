"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform, useInView, useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/ui/reveal";
import { Scissors, Ruler, Award, Sparkles, ArrowRight, PlayCircle } from "lucide-react";

const FEATURES = [
  { Icon: Scissors, title: "Cours filmés en atelier", desc: "Chaque geste expliqué, du fil à l'aiguille, en pas-à-pas." },
  { Icon: Ruler, title: "Patrons numériques inclus", desc: "PDF A4 · A0 · projecteur, tailles FR · EU · DZ, marges incluses." },
  { Icon: Award, title: "Certificat reconnu", desc: "Validez vos acquis et lancez votre activité couture." },
];

const GALLERY = [
  { src: "/images/mannequin-couture.jpg", label: "Couture machine", tag: "Niveau 1" },
  { src: "/images/mannequin-dessin.jpg", label: "Modélisme & croquis", tag: "Niveau 2" },
  { src: "/images/mannequin-mode.jpg", label: "Création de mode", tag: "Niveau 3" },
];

function GalleryCard({ g, index }: { g: (typeof GALLERY)[number]; index: number }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay: reduce ? 0 : index * 0.11 }}
      whileHover={reduce ? undefined : { scale: 1.03, rotate: 0.5 }}
      style={{ transitionProperty: "transform" }}
      className="group relative rounded-3xl overflow-hidden shadow-soft border border-cream-200"
    >
      <img src={g.src} alt={g.label} className="w-full h-60 object-cover transition-transform duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-violet-950/70 via-violet-950/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-5">
        <span className="inline-block text-[11px] font-bold text-white bg-orange-DEFAULT px-2.5 py-1 rounded-full mb-2">{g.tag}</span>
        <h3 className="font-playfair text-xl font-bold text-white">{g.label}</h3>
      </div>
    </motion.div>
  );
}

export function AtelierShowcaseSection() {
  const reduce = useReducedMotion();
  const imgRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: imgRef, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [-30, 30]);

  return (
    <section className="relative py-24 bg-gradient-to-b from-cream-DEFAULT to-white overflow-hidden">
      <div className="absolute -top-20 right-0 w-[36rem] h-[36rem] rounded-full bg-orange-200/30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -left-20 w-[28rem] h-[28rem] rounded-full bg-violet-200/30 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Image (parallax) */}
          <Reveal animation="left" className="relative">
            <div className="absolute -inset-4 bg-gradient-to-tr from-orange-DEFAULT/30 via-blush-300/20 to-violet-DEFAULT/30 rounded-[2.5rem] blur-2xl" />
            <div ref={imgRef} className="relative rounded-[2rem] overflow-hidden border-[6px] border-white shadow-2xl h-[26rem]">
              <motion.img
                src="/images/mannequin-couture.jpg" alt="Mannequin de bois à la machine à coudre"
                style={{ y: reduce ? 0 : y }}
                className="absolute inset-x-0 -top-8 w-full h-[calc(26rem+4rem)] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-violet-950/25 to-transparent" />
            </div>
            <div className="absolute -bottom-6 -right-4 sm:right-6 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-cream-200 px-5 py-3.5 flex items-center gap-3">
              <span className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><PlayCircle size={22} /></span>
              <div>
                <p className="font-playfair font-bold text-gray-900 text-lg leading-none">127 cours</p>
                <p className="text-xs text-gray-500 font-dm mt-0.5">filmés en atelier</p>
              </div>
            </div>
          </Reveal>

          {/* Texte */}
          <div>
            <Reveal animation="up">
              <span className="inline-flex items-center gap-2 text-orange-600 font-semibold font-dm text-sm tracking-wide mb-4">
                <Sparkles size={16} /> L'ATELIER ARAZZO
              </span>
              <h2 className="font-playfair text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5">
                Apprenez en regardant,{" "}
                <span className="text-orange-600 italic">progressez en cousant</span>.
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed mb-8 font-dm max-w-xl">
                Des formatrices passionnées d'Alger, Casablanca et Tunis vous accompagnent,
                pas à pas, de votre première couture jusqu'à la création de votre propre marque.
              </p>
            </Reveal>

            {/* Bullet points : depuis la gauche, stagger 0.12s */}
            <div className="space-y-4 mb-9">
              {FEATURES.map(({ Icon, title, desc }, i) => (
                <Reveal key={title} animation="left" delay={i * 120} className="flex items-start gap-4">
                  <span className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-100 to-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0">
                    <Icon size={20} />
                  </span>
                  <div>
                    <h3 className="font-semibold text-gray-900 font-dm">{title}</h3>
                    <p className="text-gray-500 text-sm font-dm">{desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal animation="up" delay={120}>
              <Link href="/formations"
                className="group inline-flex items-center gap-2 bg-gradient-to-r from-orange-DEFAULT to-orange-500 text-white px-7 py-3.5 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all font-dm">
                Voir les formations
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </Reveal>
          </div>
        </div>

        {/* Galerie 3 niveaux */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mt-20">
          {GALLERY.map((g, i) => (
            <GalleryCard key={g.label} g={g} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
