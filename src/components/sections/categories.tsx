import Link from "next/link";
import { SectionHeading } from "@/components/ui/section-heading";
import { Reveal } from "@/components/ui/reveal";
import { Scissors, PencilRuler, Ruler, Gem, Hand, MonitorSmartphone, Megaphone, Route, ArrowUpRight } from "lucide-react";

const CATEGORIES = [
  { Icon: Scissors, fr: "Couture & Modélisme", ar: "خياطة / موديلزم", chip: "bg-orange-50 text-orange-600" },
  { Icon: PencilRuler, fr: "Dessin & Stylisme", ar: "رسم / ستيليزم", chip: "bg-violet-50 text-violet-700" },
  { Icon: Ruler, fr: "Patronage industriel", ar: "باتروناج صناعي", chip: "bg-blush-50 text-blush-500" },
  { Icon: Gem, fr: "Accessoires", ar: "الأكسسوارات", chip: "bg-orange-50 text-orange-600" },
  { Icon: Hand, fr: "Artisanat", ar: "حرف يدوية", chip: "bg-violet-50 text-violet-700" },
  { Icon: MonitorSmartphone, fr: "Logiciels de confection", ar: "البرامج الرقمية", chip: "bg-blush-50 text-blush-500" },
  { Icon: Megaphone, fr: "Marketing couture", ar: "التسويق الرقمي", chip: "bg-orange-50 text-orange-600" },
  { Icon: Route, fr: "Parcours structurés", ar: "مسارات", chip: "bg-violet-50 text-violet-700" },
];

export function CategoriesSection() {
  return (
    <section className="relative py-24 bg-white overflow-hidden">
      <div className="absolute bottom-0 right-1/2 translate-x-1/2 w-[40rem] h-64 bg-blush-100/40 blur-3xl rounded-full pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading eyebrow="Nos univers" title="Explorez toutes les" highlight="spécialités couture" />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {CATEGORIES.map((c, i) => (
            <Reveal key={c.fr} animation="up" delay={(i % 4) * 80}>
              <Link href="/formations"
                className="group block bg-white rounded-3xl p-6 border border-cream-200 shadow-soft hover:shadow-xl hover:-translate-y-1 transition-[transform,box-shadow] duration-300 h-full">
                <div className="flex items-start justify-between mb-5">
                  <span className={`w-14 h-14 rounded-2xl flex items-center justify-center ${c.chip} group-hover:scale-110 transition-transform`}>
                    <c.Icon size={26} strokeWidth={1.75} />
                  </span>
                  <ArrowUpRight size={18} className="text-gray-300 group-hover:text-orange-DEFAULT group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <h3 className="font-playfair text-lg font-bold text-gray-900 leading-snug">{c.fr}</h3>
                <p className="text-sm text-gray-400 font-dm mt-1" dir="rtl">{c.ar}</p>
              </Link>
            </Reveal>
          ))}
        </div>

        {/* Bandeau « 2 façons d'apprendre » */}
        <Reveal animation="up" delay={120}>
          <div className="mt-12 grid sm:grid-cols-2 gap-4">
            <div className="rounded-3xl p-7 bg-gradient-to-br from-orange-50 to-blush-50 border border-orange-100">
              <p className="text-xs font-bold uppercase tracking-wide text-orange-600 mb-2">Ateliers indépendants</p>
              <p className="text-gray-700 font-dm">Apprenez une technique précise, à votre rythme, sans engagement.</p>
            </div>
            <div className="rounded-3xl p-7 bg-gradient-to-br from-violet-50 to-orange-50 border border-violet-100">
              <p className="text-xs font-bold uppercase tracking-wide text-violet-700 mb-2">Parcours structurés</p>
              <p className="text-gray-700 font-dm">Progressez étape par étape, du débutant à la création de votre marque.</p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
