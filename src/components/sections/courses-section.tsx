import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/ui/reveal";

const demoCourses = [
  {
    slug:      "lancer-atelier-couture-algerie",
    titre_fr:  "Lancer son atelier couture en Algérie",
    titre_ar:  "إطلاق ورشة الخياطة في الجزائر",
    image:     "/images/hero-modelisme-1.jpg",
    prix_dzd:  3900, prix_eur: 39,
    niveau:    "Débutant", duree: "3h",
  },
  {
    slug:      "machine-a-coudre-bases",
    titre_fr:  "Apprendre la machine à coudre — bases",
    titre_ar:  "تعلّم ماكينة الخياطة — الأساسيات",
    image:     "/images/cours-finition.jpg",
    prix_dzd:  2900, prix_eur: 29,
    prix_barre: 4900,
    niveau:    "Débutant", duree: "4h",
  },
  {
    slug:      "caftan-moderne-pas-a-pas",
    titre_fr:  "Caftan moderne pas à pas",
    titre_ar:  "القفطان العصري خطوة بخطوة",
    image:     "/images/cours-modelisme-3.png",
    prix_dzd:  18500, prix_eur: 185,
    niveau:    "Avancé", duree: "12h",
  },
];

const niveauStyle: Record<string, string> = {
  "Débutant":      "bg-emerald-100 text-emerald-700",
  "Intermédiaire": "bg-orange-100  text-orange-700",
  "Avancé":        "bg-orange-100  text-orange-600",
};

export function CoursesSection({ courses }: { courses?: any[] }) {
  const list = courses && courses.length > 0 ? courses : demoCourses;

  return (
    <section className="relative py-24 bg-blush-mesh overflow-hidden">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <span className="inline-flex items-center gap-2 text-blush-500 font-semibold text-sm font-dm mb-3 tracking-[0.2em] uppercase">
              <span className="w-8 h-px bg-blush-400" /> ✂ Sélection de la semaine
            </span>
            <h2 className="font-playfair text-4xl lg:text-5xl font-bold text-gray-900 leading-tight">
              Les cours <span className="text-gradient-rose italic">à ne pas manquer</span>
            </h2>
            <p className="text-gray-500 mt-3 font-dm">
              Vidéos HD · Patrons PDF · Certificat · Paiement en DA
            </p>
          </div>
          <Link href="/formations"
            className="hidden md:inline-flex items-center gap-2 border-2 border-orange-DEFAULT text-orange-600 font-semibold px-5 py-2.5 rounded-xl hover:bg-orange-DEFAULT hover:text-white transition-all font-dm shrink-0"
          >
            Tout le catalogue →
          </Link>
        </div>

        {/* ── Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {list.slice(0, 6).map((course: any, i: number) => (
            <Reveal key={course.slug} animation="up" delay={(i % 3) * 120}>
            <Link href={`/formations/${course.slug}`} className="group block h-full">
              <div className="h-full bg-white rounded-3xl overflow-hidden border border-cream-200 shadow-soft hover:shadow-2xl hover:-translate-y-1.5 transition-[transform,box-shadow] duration-300">

                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-cream-100">
                  <Image
                    src={course.image || course.thumbnail || "/images/hero-modelisme-1.jpg"}
                    alt={course.titre_fr}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                  {/* Badges */}
                  <span className={`absolute top-3 left-3 text-xs font-bold px-3 py-1 rounded-full font-dm ${niveauStyle[course.niveau] ?? "bg-gray-100 text-gray-600"}`}>
                    {course.niveau}
                  </span>
                  {course.duree && (
                    <span className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-dm">
                      ⏱ {course.duree}
                    </span>
                  )}

                  {/* Play icon on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-xl">
                      <span className="text-orange-600 text-xl ml-1">▶</span>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="font-playfair font-bold text-gray-900 text-[17px] mb-1 line-clamp-2 group-hover:text-orange-600 transition-colors">
                    {course.titre_fr}
                  </h3>
                  {course.titre_ar && (
                    <p className="text-sm text-gray-400 text-right font-arabic mb-3" dir="rtl">
                      {course.titre_ar}
                    </p>
                  )}

                  {/* Prix */}
                  <div className="flex items-center justify-between pt-3 border-t border-cream-100 mt-2">
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
                    <span className="bg-orange-DEFAULT text-white text-xs font-bold px-3 py-1.5 rounded-xl group-hover:bg-orange-DEFAULT transition-colors font-dm">
                      Voir →
                    </span>
                  </div>
                </div>
              </div>
            </Link>
            </Reveal>
          ))}
        </div>

        <div className="text-center mt-10 md:hidden">
          <Link href="/formations" className="inline-flex items-center gap-2 text-orange-600 font-semibold hover:underline font-dm">
            Voir tout le catalogue →
          </Link>
        </div>
      </div>
    </section>
  );
}
