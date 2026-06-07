"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { SectionHeading } from "@/components/ui/section-heading";
import { Clapperboard, Ruler, GraduationCap, type LucideIcon } from "lucide-react";
import { HOME, type Lang } from "@/lib/home-i18n";

const META: { num: string; Icon: LucideIcon; tint: string }[] = [
  { num: "01", Icon: Clapperboard, tint: "from-violet-DEFAULT/15 to-violet-DEFAULT/5 text-violet-700" },
  { num: "02", Icon: Ruler, tint: "from-blush-200/60 to-blush-100/40 text-blush-500" },
  { num: "03", Icon: GraduationCap, tint: "from-orange-DEFAULT/15 to-orange-DEFAULT/5 text-orange-600" },
];

function PillarCard({ num, Icon, tint, title, desc, index }: { num: string; Icon: LucideIcon; tint: string; title: string; desc: string; index: number }) {
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
      <span className="absolute top-6 right-7 font-playfair text-7xl font-bold text-cream-200 select-none group-hover:text-orange-DEFAULT transition-colors duration-300">{num}</span>
      <div className="relative">
        <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${tint} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform`}>
          <Icon size={30} strokeWidth={1.75} />
        </div>
        <h3 className="font-playfair text-2xl font-bold text-gray-900 mb-3">{title}</h3>
        <p className="text-gray-600 leading-relaxed font-dm">{desc}</p>
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-violet-500 via-blush-400 to-orange-DEFAULT rounded-b-[1.75rem] scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
    </motion.div>
  );
}

export function ApproachSection({ lang = "fr" }: { lang?: Lang }) {
  const t = HOME[lang].approach;
  return (
    <section className="relative py-24 bg-white overflow-hidden">
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-72 bg-blush-100/40 blur-3xl rounded-full pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow={t.eyebrow} title={t.title} highlight={t.hi} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {META.map((m, i) => (
            <PillarCard key={m.num} {...m} title={t.items[i].title} desc={t.items[i].desc} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
