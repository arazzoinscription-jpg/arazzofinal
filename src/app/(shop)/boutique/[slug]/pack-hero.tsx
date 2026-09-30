import Link from "next/link";
import { BarChart3, PlayCircle, FileText, Sparkles, GraduationCap } from "lucide-react";
import { CourseHeroCarousel } from "@/app/(public)/formations/[slug]/course-hero-carousel";

export interface PackHeroData {
  title: string;
  description: string | null;
  gallery: string[];          // galerie propre au pack
  fallbackImages: string[];   // miniatures des cours inclus (si pas de galerie)
  formationsCount: number;
  lessonsCount: number;
  priceDzd: number;
  totalDzd: number;           // valeur cumulée des cours (pour l'économie)
  priceEur?: number | null;
}

/**
 * En-tête d'une FORMATION (pack) — même design que l'en-tête d'une page cours
 * (/formations/[slug]) : dégradé violet, titre, stats, et carrousel en haut.
 * S'intègre en carte arrondie dans le layout boutique (max-w-7xl).
 */
export function PackHero({ data, reserveHref, reserveLabel }: { data: PackHeroData; reserveHref: string; reserveLabel: string }) {
  const images = data.gallery.length > 0 ? data.gallery : data.fallbackImages;
  const eco = data.totalDzd > data.priceDzd ? data.totalDzd - data.priceDzd : 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-800 via-violet-DEFAULT to-[#2a1245] p-6 sm:p-10 mb-10">
      <div className="absolute -top-20 end-1/4 w-[34rem] h-[34rem] rounded-full bg-orange-500/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 start-0 w-[28rem] h-[28rem] rounded-full bg-violet-500/30 blur-3xl pointer-events-none" />

      <div className="relative grid lg:grid-cols-5 gap-8 lg:gap-10 items-center">
        {/* Texte */}
        <div className="lg:col-span-3 text-white">
          <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            <BarChart3 size={13} /> Formation complète
          </span>

          <h1 className="font-playfair text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">{data.title}</h1>

          {data.description && (
            <p className="text-violet-100/90 font-dm mt-4 max-w-2xl line-clamp-3 leading-relaxed">{data.description}</p>
          )}

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6 text-sm font-dm">
            <span className="inline-flex items-center gap-1.5 text-violet-100"><FileText size={15} /> {data.formationsCount} formation{data.formationsCount > 1 ? "s" : ""}</span>
            {data.lessonsCount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-violet-100"><PlayCircle size={15} /> {data.lessonsCount} leçons</span>
            )}
          </div>

          {/* Prix + économie */}
          <div className="flex flex-wrap items-baseline gap-3 mt-6">
            <span className="text-3xl font-playfair font-bold text-white">{data.priceDzd.toLocaleString("fr-DZ")} DA</span>
            {data.priceEur ? <span className="text-violet-200 font-dm">/ {data.priceEur}€</span> : null}
            {eco > 0 && (
              <span className="inline-flex items-center gap-1.5 bg-orange-DEFAULT text-white text-xs font-bold px-2.5 py-1 rounded-full">
                <Sparkles size={12} /> Économie {eco.toLocaleString("fr-DZ")} DA
              </span>
            )}
          </div>

          <Link href={reserveHref}
            className="mt-6 inline-flex items-center justify-center gap-2 bg-orange-DEFAULT text-white px-7 py-3.5 rounded-xl font-bold hover:bg-orange-600 active:scale-[0.98] transition-all shadow-glow">
            <GraduationCap size={18} /> {reserveLabel}
          </Link>
        </div>

        {/* Carrousel */}
        <div className="lg:col-span-2">
          {images.length > 0 ? (
            <CourseHeroCarousel images={images} title={data.title} />
          ) : (
            <div className="rounded-3xl overflow-hidden border-4 border-white/10 shadow-2xl aspect-video bg-gradient-to-br from-violet-600 to-orange-500" />
          )}
        </div>
      </div>
    </div>
  );
}
