"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe";
import { HOME, type Lang } from "@/lib/home-i18n";
import { GlowCard } from "@/components/ui/glow-card";

const demoCourses = [
  {
    slug: "lancer-atelier-couture-algerie",
    titre_fr: "Lancer son atelier couture en Algérie",
    titre_ar: "إطلاق ورشة الخياطة في الجزائر",
    image: "/images/hero-modelisme-1.jpg",
    prix_dzd: 3900, prix_eur: 39, niveau: "Débutant", duree: "3h",
  },
  {
    slug: "machine-a-coudre-bases",
    titre_fr: "Apprendre la machine à coudre — bases",
    titre_ar: "تعلّم ماكينة الخياطة — الأساسيات",
    image: "/images/cours-finition.jpg",
    prix_dzd: 2900, prix_eur: 29, prix_barre: 4900, niveau: "Débutant", duree: "4h",
  },
  {
    slug: "caftan-moderne-pas-a-pas",
    titre_fr: "Caftan moderne pas à pas",
    titre_ar: "القفطان العصري خطوة بخطوة",
    image: "/images/cours-modelisme-3.png",
    prix_dzd: 18500, prix_eur: 185, niveau: "Avancé", duree: "12h",
  },
];

const niveauStyle: Record<string, string> = {
  "Débutant": "bg-emerald-100 text-emerald-700",
  "Intermédiaire": "bg-orange-100 text-orange-700",
  "Avancé": "bg-orange-100 text-orange-600",
};

function CourseCard({ course, index, see }: { course: any; index: number; see: string }) {
  const ref = useRef(null);
  const reduce = useReducedMotionSafe();
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <Link href={`/formations/${course.slug}`} className="group block h-full">
      <GlowCard customSize glowColor="orange" className="h-full !p-0 !rounded-3xl !border-0 !shadow-none !backdrop-blur-0">
      <motion.div
        ref={ref}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ delay: reduce ? 0 : index * 0.12, duration: 0.5 }}
        whileHover={reduce ? undefined : { y: -8, transition: { duration: 0.25 } }}
        className="relative z-[1] h-full bg-white dark:bg-white/[0.04] rounded-3xl overflow-hidden border border-cream-200 dark:border-white/10 shadow-soft"
      >
        <div className="relative aspect-video overflow-hidden bg-cream-100">
          <Image
            src={[course.image, course.thumbnail].find((s) => typeof s === "string" && (s.startsWith("/") || s.startsWith("http"))) || "/images/hero-modelisme-1.jpg"}
            alt={course.titre_fr}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <span className={`absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full font-dm ${niveauStyle[course.niveau] ?? "bg-gray-100 text-gray-600"}`}>
            {course.niveau}
          </span>
          {course.duree && (
            <span className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-dm">
              ⏱ {course.duree}
            </span>
          )}

          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
              <span className="text-orange-600 text-xl ml-1">▶</span>
            </div>
          </div>
        </div>

        <div className="p-5">
          <h3 className="font-playfair font-bold text-gray-900 dark:text-white text-[17px] mb-1 line-clamp-2 group-hover:text-orange-600 dark:group-hover:text-orange-300 transition-colors">
            {course.titre_fr}
          </h3>
          {course.titre_ar && (
            <p className="text-sm text-gray-400 text-right font-arabic mb-2" dir="rtl">{course.titre_ar}</p>
          )}
          {course.formateur?.nom && (
            <p className="text-xs text-gray-500 dark:text-white/50 font-dm mb-2 flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-300 text-[10px] font-bold flex items-center justify-center">
                {course.formateur.nom[0]}
              </span>
              par {course.formateur.nom}
            </p>
          )}

          <div className="flex items-center justify-between pt-3 border-t border-cream-100 dark:border-white/10 mt-2">
            <div className="flex items-baseline gap-2">
              {course.prix_barre && (
                <span className="text-sm text-gray-300 line-through font-dm">
                  {Number(course.prix_barre).toLocaleString("fr-DZ")}
                </span>
              )}
              <span className="text-xl font-bold text-orange-DEFAULT font-playfair">
                {Number(course.prix_dzd).toLocaleString("fr-DZ")} DA
              </span>
            </div>
            <motion.span
              whileHover={{ x: 4 }} transition={{ duration: 0.2 }}
              className="bg-orange-DEFAULT text-white text-xs font-bold px-3 py-1.5 rounded-xl font-dm inline-block"
            >
              {see}
            </motion.span>
          </div>
        </div>
      </motion.div>
      </GlowCard>
    </Link>
  );
}

export function CoursesSection({ courses, lang = "fr" }: { courses?: any[]; lang?: Lang }) {
  const list = courses && courses.length > 0 ? courses : demoCourses;
  const t = HOME[lang].courses;

  return (
    <section className="relative py-24 bg-transparent overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="inline-flex items-center gap-2 text-blush-500 font-semibold text-sm font-dm mb-3 tracking-[0.2em] uppercase">
              <span className="w-8 h-px bg-blush-400" /> {t.eyebrow}
            </span>
            <h2 className="font-playfair text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
              {t.title} <span className="text-gradient-rose italic">{t.hi}</span>
            </h2>
            <p className="text-gray-500 dark:text-white/50 mt-3 font-dm">{t.subtitle}</p>
          </div>
          <Link href="/formations"
            className="hidden md:inline-flex items-center gap-2 bg-orange-DEFAULT text-white font-semibold px-5 py-2.5 rounded-xl shadow-md hover:bg-orange-600 hover:-translate-y-0.5 transition-all font-dm shrink-0"
          >
            {t.catalog}
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {list.slice(0, 6).map((course: any, i: number) => (
            <CourseCard key={course.slug ?? i} course={course} index={i} see={t.see} />
          ))}
        </div>

        <div className="text-center mt-10 md:hidden">
          <Link href="/formations" className="inline-flex items-center gap-2 text-orange-600 font-semibold hover:underline font-dm">
            {t.catalogMobile}
          </Link>
        </div>
      </div>
    </section>
  );
}
