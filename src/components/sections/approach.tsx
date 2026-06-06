"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { Clapperboard, Ruler, GraduationCap } from "lucide-react";

const pillars = [
  {
    num: "01", Icon: Clapperboard, title: "Formations vidéo",
    desc: "Du débutant à l'expert — pas-à-pas filmés en atelier, avec patrons à télécharger.",
    tint: "from-violet-DEFAULT/15 to-violet-DEFAULT/5 text-violet-700",
  },
  {
    num: "02", Icon: Ruler, title: "Patrons numériques",
    desc: "PDF A4 · A0 · DXF · projecteur. Marges de couture incluses, mesures FR + EU + DZ.",
    tint: "from-blush-200/60 to-blush-100/40 text-blush-500",
  },
  {
    num: "03", Icon: GraduationCap, title: "Espace formateur",
    desc: "Vendez vos cours et vos patrons. Commission claire, paiement en DZD ou en EUR.",
    tint: "from-orange-DEFAULT/15 to-orange-DEFAULT/5 text-orange-600",
  },
];

function PillarCard({ p, index }: { p: (typeof pillars)[number]; index: number }) {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.div
      ref={ref}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: reduce ? 0 : index * 0.15 }}
      whileHover={{ y: -6, boxShadow: "0 12px 32px rgba(107,33,200,0.12)" }}
      className="group relative bg-white rounded-[1.75rem] p-8 border border-cream-200 shadow-soft transition-colors duration-300"
    >
      {/* Numéro géant en filigrane → orange au hover */}
      <span className="absolute top-6 right-7 font-playfair text-7xl font-bold text-cream-200 select-none group-hover:text-orange-DEFAULT transition-colors duration-300">
        {p.num}
      </span>

      <div className="relative">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${p.tint} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
          <p.Icon size={30} strokeWidth={1.75} />
        </div>
        <h3 className="font-playfair text-2xl font-bold text-gray-900 mb-3">{p.title}</h3>
        <p className="text-gray-600 leading-relaxed font-dm">{p.desc}</p>
      </div>

      {/* Barre bas au hover */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 via-blush-400 to-orange-DEFAULT rounded-b-[1.75rem] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
    </motion.div>
  );
}

export function ApproachSection() {
  return (
    <section className="relative py-24 bg-white overflow-hidden">
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-72 bg-blush-100/40 blur-3xl rounded-full pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Notre approche" title="Tout pour passer du" highlight="fil au design" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pillars.map((p, i) => (
            <PillarCard key={p.num} p={p} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
